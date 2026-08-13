const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const stringSession = new StringSession(''); 

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

let isConnected = false;
async function ensureConnection() {
    if (!isConnected) {
        await client.connect();
        isConnected = true;
    }
}

let currentPhoneCodeHash = '';

// Diese Routen passen jetzt genau zu deinem Frontend-Code
app.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    try {
        await ensureConnection();
        const result = await client.sendCode({ apiId, apiHash }, phone);
        currentPhoneCodeHash = result.phoneCodeHash;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { phone, phoneCode } = req.body;
    try {
        await ensureConnection();
        await client.signIn({
            phoneNumber: phone,
            phoneCode: phoneCode,
            phoneCodeHash: currentPhoneCodeHash
        });
        
        const sessionString = client.session.save();
        res.json({ success: true, session: sessionString });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Server läuft.'));
