const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');

const app = express();
app.use(express.json());
app.use(cors());

const apiId = 23049703;
const apiHash = "e9c00af578a9de0253ef02337460498f";
const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 5
});

// WICHTIG: Verbindung beim Start aufbauen
(async () => {
    await client.connect();
    console.log("Telegram Client verbunden.");
})();

app.post('/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    try {
        const result = await client.invoke(new Api.auth.SendCode({
            phoneNumber: phoneNumber,
            apiId: apiId,
            apiHash: apiHash,
            settings: new Api.CodeSettings({}),
        }));
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (e) {
        console.error("Fehler bei SendCode:", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { phoneNumber, phoneCode, phoneCodeHash } = req.body;
    try {
        const result = await client.invoke(new Api.auth.SignIn({
            phoneNumber: phoneNumber,
            phoneCodeHash: phoneCodeHash,
            phoneCode: phoneCode,
        }));
        const sessionString = client.session.save();
        res.json({ success: true, session: sessionString });
    } catch (e) {
        console.error("Fehler bei SignIn:", e);
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend läuft auf Port ${PORT}`));
