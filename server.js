const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input'); // Falls benötigt, sonst entfernen

const app = express();
app.use(cors());
app.use(express.json());

// DEINE DATEN HIER EINTRAGEN
const apiId = 23049703; 
const apiHash = "e9c00af578a9de0253ef02337460498f";
const stringSession = new StringSession(""); // Leere Session für neue Logins

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

(async () => {
    await client.connect();
    console.log("Datenbank verbunden und Telegram-Client bereit.");
})();

app.post('/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    try {
        const result = await client.sendCode({ apiId, apiHash }, phoneNumber);
        console.log("OTP gesendet:", result.phoneCodeHash);
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (err) {
        console.error("Fehler beim Senden:", err);
        res.json({ success: false, error: err.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { phoneNumber, phoneCode, phoneCodeHash } = req.body;
    try {
        const result = await client.signIn({
            apiId,
            apiHash,
            authKeyType: null,
            phoneNumber,
            phoneCode,
            phoneCodeHash
        });
        console.log("Login erfolgreich!");
        res.json({ success: true, user: result });
    } catch (err) {
        console.error("Fehler beim Verify:", err);
        res.json({ success: false, error: err.message });
    }
});

app.listen(3000, () => console.log('Server läuft auf Port 3000'));
