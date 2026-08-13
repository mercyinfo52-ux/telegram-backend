const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';

let client;
let currentPhoneCodeHash;

app.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        
        const result = await client.sendCode({ apiId, apiHash }, phoneNumber);
        currentPhoneCodeHash = result.phoneCodeHash;
        
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        
        // Korrekte Syntax für die neueste gramjs Version
        await client.signIn({
            apiId,
            apiHash,
            phoneNumber: phoneNumber,
            phoneCodeHash: currentPhoneCodeHash,
            phoneCode: code
        });

        res.json({ success: true, session: client.session.save() });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.listen(process.env.PORT || 3000);
