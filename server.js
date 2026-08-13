const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const stringSession = new StringSession(''); 

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

// WICHTIG: Einmal global verbinden, nicht bei jeder Anfrage
let isConnected = false;
async function ensureConnection() {
    if (!isConnected) {
        await client.connect();
        isConnected = true;
        console.log("Telegram Client verbunden.");
    }
}

let currentPhoneCodeHash = '';

app.post('/send-code', async (req, res) => {
    const { phone } = req.body;
    try {
        await ensureConnection();
        const result = await client.sendCode({
            apiId,
            apiHash,
        }, phone);
        
        currentPhoneCodeHash = result.phoneCodeHash;
        console.log("Code gesendet für:", phone);
        res.json({ success: true });
    } catch (err) {
        console.error("Fehler bei sendCode:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/verify-code', async (req, res) => {
    const { phone, phoneCode } = req.body;
    try {
        await ensureConnection();
        
        // signIn Prozess
        const user = await client.signIn({
            phoneNumber: phone,
            phoneCode: phoneCode,
            phoneCodeHash: currentPhoneCodeHash
        });
        
        // Session speichern
        const sessionString = client.session.save();
        console.log("Session erhalten!");
        res.json({ success: true, session: sessionString });
    } catch (err) {
        console.error("Fehler bei signIn:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Server läuft auf Port 3000'));
