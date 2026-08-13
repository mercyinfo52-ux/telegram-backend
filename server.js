const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703; 
const apiHash = "e9c00af578a9de0253ef02337460498f";
const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 5,
});

// Sicherstellen, dass der Client bereit ist
(async () => {
    try {
        await client.connect();
        console.log("Client verbunden.");
    } catch (e) {
        console.error("Verbindungsfehler:", e);
    }
})();

app.post('/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    try {
        // Prüfen ob client verbunden
        if (!client.connected) await client.connect();

        const result = await client.sendCode({ apiId, apiHash }, phoneNumber);
        console.log("OTP angefordert für:", phoneNumber, "Hash:", result.phoneCodeHash);
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (err) {
        console.error("Telegram API Error:", err);
        // Flood wait handling
        if (err.seconds) {
            res.json({ success: false, error: `Rate limited: Warte ${err.seconds} Sekunden.` });
        } else {
            res.json({ success: false, error: err.message });
        }
    }
});

app.post('/verify-otp', async (req, res) => {
    const { phoneNumber, phoneCode, phoneCodeHash } = req.body;
    try {
        const result = await client.signIn({
            apiId,
            apiHash,
            phoneNumber,
            phoneCode,
            phoneCodeHash
        });
        
        // Hier Session speichern (Mongoose wäre hier der nächste Schritt)
        console.log("Login erfolgreich für:", phoneNumber);
        res.json({ success: true, user: result });
    } catch (err) {
        console.error("Verify Error:", err);
        res.json({ success: false, error: err.message });
    }
});

app.listen(3000, () => console.log('Server läuft.'));
