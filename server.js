const express = require('express');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';

// Hier speichern wir die temporären Daten pro Telefonnummer
const activeLogins = new Map();

app.post('/send-code', async (req, res) => {
    const { phone } = req.body;
    try {
        const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 1 });
        await client.connect();
        
        const result = await client.sendCode({ apiId, apiHash }, phone);
        
        // Speichere Client und Hash für diesen speziellen User
        activeLogins.set(phone, { client, phoneCodeHash: result.phoneCodeHash });
        
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/verify-code', async (req, res) => {
    const { phone, code, phoneCodeHash } = req.body;
    const loginData = activeLogins.get(phone);

    if (!loginData) {
        return res.status(400).json({ error: "Keine aktive Session gefunden. Bitte erneut versuchen." });
    }

    try {
        const { client } = loginData;
        await client.signIn({
            apiId,
            apiHash,
            phoneNumber: phone,
            phoneCodeHash: phoneCodeHash,
            phoneCode: code
        });
        
        const sessionString = client.session.save();
        activeLogins.delete(phone); // Cleanup
        
        res.json({ success: true, session: sessionString });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Backend läuft'));
