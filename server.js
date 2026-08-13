const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// CONFIG
const apiId = 23049703; // Deine API ID
const apiHash = 'e9c00af578a9de0253ef02337460498f'; // Dein API Hash
const dbUri = 'mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/?appName=Cluster0';

mongoose.connect(dbUri);

let client = null;
let phoneCodeHash = null;

app.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        const result = await client.sendCode({ apiId, apiHash }, phoneNumber);
        phoneCodeHash = result.phoneCodeHash;
        res.json({ success: true, phoneCodeHash });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        await client.signIn({
            apiId,
            apiHash,
            phoneNumber,
            phoneCode: code,
            phoneCodeHash: phoneCodeHash
        });
        const sessionString = client.session.save();
        res.json({ success: true, session: sessionString });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
