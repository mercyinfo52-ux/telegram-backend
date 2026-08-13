const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const activeSessions = new Map(); // Speichert nur: phone -> { client, phoneCodeHash }

app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        console.log("OTP angefordert für:", phone);
        
        const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        
        const result = await client.sendCode({ apiId, apiHash }, phone);
        
        // Wir speichern NUR die Client-Instanz und den Hash
        activeSessions.set(phone, { client, phoneCodeHash: result.phoneCodeHash });
        
        res.json({ success: true });
    } catch (e) {
        console.error("Fehler bei send-otp:", e.message);
        res.status(400).json({ error: e.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code, phoneCodeHash } = req.body;
        const session = activeSessions.get(phone);
        
        if (!session) return res.status(400).json({ error: "Session abgelaufen oder nicht gefunden" });

        // Sicherheitsprüfung: Ist es wirklich ein Client?
        if (typeof session.client.signIn !== 'function') {
            throw new Error("Client Instanz beschädigt (signIn nicht gefunden)");
        }

        await session.client.signIn({
            apiId,
            apiHash,
            phoneNumber: phone,
            phoneCode: code,
            phoneCodeHash: session.phoneCodeHash 
        });

        res.json({ success: true });
        activeSessions.delete(phone); // Session nach Erfolg löschen
    } catch (e) {
        console.error("Fehler bei verify-otp:", e.message);
        res.status(400).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
