const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';

let client = null;
let currentPhoneCodeHash = null;

app.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        // Client neu instanziieren
        client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        
        const result = await client.sendCode({ apiId, apiHash }, phoneNumber);
        currentPhoneCodeHash = result.phoneCodeHash;
        
        res.json({ success: true, phoneCodeHash: currentPhoneCodeHash });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    if (!client) return res.status(400).json({ error: "Keine aktive Session. Sende erst die Nummer." });
    
    try {
        const { phoneNumber, code } = req.body;
        
        // Direkter Aufruf, falls signIn Helper-Methode zickt
        await client.invoke(new Api.auth.SignIn({
            phoneNumber: phoneNumber,
            phoneCodeHash: currentPhoneCodeHash,
            phoneCode: code
        }));

        const session = client.session.save();
        res.json({ success: true, session: session });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Server läuft."));
