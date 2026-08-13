const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const MONGO_URI = process.env.MONGODB_URI || 'DEINE_MONGODB_URI';

mongoose.connect(MONGO_URI);

const SessionSchema = new mongoose.Schema({
    phone: String,
    session: String
});
const Session = mongoose.model('Session', SessionSchema);

// Map hält die Client-Instanzen temporär
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
            // Die richtige, stabile Methode für gramjs v2+
            await session.client.signInUser({
                apiId: apiId,
                apiHash: apiHash,
                phoneNumber: phone,
                phoneCode: code,
                phoneCodeHash: phoneCodeHash,
                password: password 
            });
            
            const sessionString = session.client.session.save();
            await Session.create({ phone, session: sessionString });
            res.json({ success: true });
        } catch (err) {
            // Falls 2FA verlangt wird, musst du den Fehler abfangen und Password-Eingabe triggern
            res.status(400).json({ error: err.message });
        }
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('Server läuft'));
