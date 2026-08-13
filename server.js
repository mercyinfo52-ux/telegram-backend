const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input'); // Nur falls nötig, sonst entfernen

const app = express();
app.use(cors());
app.use(express.json());

// DEINE DATEN HIER EINTRAGEN
const apiId = 23049703; 
const apiHash = 'e9c00af578a9de0253ef02337460498f';
let client;
let phoneCodeHash;

app.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        
        const result = await client.sendCode({ apiId, apiHash }, phoneNumber);
        phoneCodeHash = result.phoneCodeHash;
        
        res.json({ success: true, phoneCodeHash });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        
        await client.signIn({
            apiId,
            apiHash,
            phoneNumber: phoneNumber,
            phoneCodeHash: phoneCodeHash,
            phoneCode: code
        });

        const sessionString = client.session.save();
        console.log("Session String:", sessionString);
        
        res.json({ success: true, session: sessionString });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
