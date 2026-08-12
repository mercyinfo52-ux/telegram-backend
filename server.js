const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// Deine Daten
const apiId = 23049703;
const apiHash = "e9c00af578a9de0253ef02337460498f";
const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });

let phoneCodeHash = "";

app.post('/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    try {
        await client.connect();
        const result = await client.sendCode({ apiId, apiHash }, phoneNumber);
        phoneCodeHash = result.phoneCodeHash;
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { phoneNumber, phoneCode, phoneCodeHash } = req.body;
    try {
        const result = await client.signInUser({
            apiId,
            apiHash,
            phoneNumber,
            phoneCode,
            phoneCodeHash
        }, { phoneNumber, phoneCode });
        
        // Session speichern
        const sessionString = client.session.save();
        console.log("Session saved:", sessionString);
        res.json({ success: true, session: sessionString });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
