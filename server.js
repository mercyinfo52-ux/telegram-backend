const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input'); // Für lokale Tests, für Server eher nicht nötig

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703; // Deine API ID
const apiHash = 'e9c00af578a9de0253ef02337460498f'; // Dein API Hash
const stringSession = new StringSession(''); 

const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

let phoneCodeHash = '';

app.post('/send-otp', async (req, res) => {
    try {
        await client.connect();
        const { phone } = req.body;
        const result = await client.sendCode({ apiId, apiHash }, phone);
        phoneCodeHash = result.phoneCodeHash;
        res.json({ success: true, message: 'Code gesendet' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code } = req.body;
        await client.signIn({
            apiId,
            apiHash,
            phoneNumber: phone,
            phoneCode: code,
            phoneCodeHash: phoneCodeHash
        });
        const sessionString = client.session.save();
        console.log('Session erfolgreich:', sessionString);
        res.json({ success: true, session: sessionString });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Server läuft auf Port 3000'));
