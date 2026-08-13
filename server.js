const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = "e9c00af578a9de0253ef02337460498f";
// Wir nutzen eine leere Session, da der User sich frisch einloggen soll
const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 5,
});

(async () => {
    await client.connect();
    console.log("Backend gestartet.");
})();

app.post('/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    try {
        const result = await client.sendCode({ apiId, apiHash }, phoneNumber.trim());
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (err) {
        console.error("Fehler send-otp:", err);
        res.json({ success: false, error: err.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { phoneNumber, phoneCode, phoneCodeHash } = req.body;
    try {
        // KORREKTER AUFRUF: 
        // 1. Argument: Nummer
        // 2. Argument: Objekt mit { phoneCode, phoneCodeHash }
        const result = await client.signIn(phoneNumber.trim(), {
            phoneCode: phoneCode.trim(),
            phoneCodeHash: phoneCodeHash
        });
        
        console.log("Erfolgreich eingeloggt!");
        res.json({ success: true, user: result });
    } catch (err) {
        console.error("Fehler verify-otp:", err);
        res.json({ success: false, error: err.message });
    }
});

app.listen(3000, () => console.log('Server läuft auf Port 3000'));
