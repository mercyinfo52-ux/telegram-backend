const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input'); // Nur für lokale Tests, im Server meist unnötig

const app = express();
app.use(cors());
app.use(express.json());

// Deine Daten
const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const stringSession = new StringSession(''); 

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

// Cache für den Hash
let phoneCodeHash = '';

// Route zum Senden des OTP
app.post('/send-code', async (req, res) => {
    const { phone } = req.body;
    try {
        await client.connect();
        const result = await client.sendCode(
            { apiId, apiHash },
            phone
        );
        phoneCodeHash = result.phoneCodeHash;
        res.json({ success: true, phoneCodeHash });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route zum Verifizieren des OTP
app.post('/verify-code', async (req, res) => {
    const { phone, phoneCode } = req.body;
    try {
        // Korrekte GramJS Signatur
        const user = await client.signIn({
            phoneNumber: phone,
            phoneCode: phoneCode,
            phoneCodeHash: phoneCodeHash
        });
        
        // Session speichern
        const sessionString = client.session.save();
        res.json({ success: true, session: sessionString });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Server läuft auf Port 3000'));
