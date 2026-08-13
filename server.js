const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// Verbindung zur DB
mongoose.connect('mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/test');

const SessionSchema = new mongoose.Schema({ phone: String, session: String });
const SessionModel = mongoose.model('Session', SessionSchema);

// Memory Cache für den laufenden Login-Prozess
const activeLogins = new Map();

app.post('/send-code', async (req, res) => {
    const { phone, apiId, apiHash } = req.body;
    const client = new TelegramClient(new StringSession(''), parseInt(apiId), apiHash, { connectionRetries: 5 });
    await client.connect();
    
    const result = await client.sendCode({ apiId: parseInt(apiId), apiHash: apiHash }, phone);
    activeLogins.set(phone, { client, phoneCodeHash: result.phoneCodeHash });
    
    res.json({ phoneCodeHash: result.phoneCodeHash });
});

app.post('/verify-code', async (req, res) => {
    const { phone, code } = req.body;
    const data = activeLogins.get(phone);
    if (!data) return res.status(400).json({ error: 'Session abgelaufen' });

    try {
        await data.client.signIn({
            phoneNumber: phone,
            phoneCode: code,
            phoneCodeHash: data.phoneCodeHash
        });
        
        const stringSession = data.client.session.save();
        await SessionModel.create({ phone, session: stringSession });
        activeLogins.delete(phone);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.listen(3000, () => console.log('Backend läuft'));
