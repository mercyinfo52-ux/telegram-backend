const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });

// Speicher für den Login-Zustand während der Sitzung
let phoneCodeHash = "";

app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        await client.connect();
        const result = await client.sendCode({ apiId, apiHash }, phone);
        phoneCodeHash = result.phoneCodeHash;
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code } = req.body;
        
        // Anmeldung durchführen
        const result = await client.signIn({
            apiId,
            apiHash
        }, phone, {
            phoneCode: code,
            phoneCodeHash: phoneCodeHash
        });

        // Session extrahieren
        const session = client.session.save();
        res.json({ success: true, session: session });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
