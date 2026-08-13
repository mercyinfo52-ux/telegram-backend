const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input'); // Falls du es brauchst, sonst entfernen

const app = express();
app.use(cors());
app.use(express.json()); // WICHTIG: Damit JSON-Daten im Body gelesen werden können

// Globale Variable für den Client (nur für einen User-Flow gleichzeitig)
let client = null;

app.post('/send-otp', async (req, res) => {
    const { phoneNumber, apiId, apiHash } = req.body;

    if (!phoneNumber || !apiId || !apiHash) {
        return res.status(400).json({ error: "Fehlende Daten" });
    }

    try {
        const session = new StringSession("");
        client = new TelegramClient(session, parseInt(apiId), apiHash, { connectionRetries: 5 });
        await client.connect();
        
        const phoneCodeHash = await client.sendCode({
            apiId: parseInt(apiId),
            apiHash: apiHash,
        }, phoneNumber);

        res.json({ success: true, phoneCodeHash: phoneCodeHash.phoneCodeHash });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { code, phoneCodeHash, phoneNumber, apiId, apiHash } = req.body;

    try {
        await client.signIn({
            apiId: parseInt(apiId),
            apiHash: apiHash,
            phoneNumber: phoneNumber,
            phoneCodeHash: phoneCodeHash,
        }, {
            phoneNumber: phoneNumber,
            phoneCode: code
        });

        const stringSession = client.session.save();
        res.json({ success: true, session: stringSession });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
