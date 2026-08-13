const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = "e9c00af578a9de0253ef02337460498f";
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
        // Direkter Aufruf der API zur Code-Anforderung
        const result = await client.invoke(new Api.auth.SendCode({
            phoneNumber: phoneNumber.trim(),
            apiId: apiId,
            apiHash: apiHash,
            settings: new Api.CodeSettings({}),
        }));
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (err) {
        console.error("Fehler send-otp:", err);
        res.json({ success: false, error: err.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { phoneNumber, phoneCode, phoneCodeHash } = req.body;
    try {
        // Direkter Aufruf der API zur Anmeldung
        await client.invoke(new Api.auth.SignIn({
            phoneNumber: phoneNumber.trim(),
            phoneCodeHash: phoneCodeHash,
            phoneCode: phoneCode.trim()
        }));
        
        console.log("Login erfolgreich!");
        res.json({ success: true });
    } catch (err) {
        console.error("Fehler verify-otp:", err);
        res.json({ success: false, error: err.message });
    }
});

app.listen(3000, () => console.log('Server läuft auf Port 3000'));
