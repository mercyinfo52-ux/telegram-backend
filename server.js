const express = require('express');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const stringSession = new StringSession(''); 

const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

// Client global verbinden
(async () => {
    await client.connect();
    console.log("Telegram Client verbunden.");
})();

app.post('/send-code', async (req, res) => {
    const { phone } = req.body;
    try {
        const result = await client.sendCode({ apiId, apiHash }, phone);
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/verify-code', async (req, res) => {
    const { phone, code, phoneCodeHash } = req.body;
    try {
        const user = await client.signIn({
            apiId,
            apiHash,
            phoneNumber: phone,
            phoneCodeHash: phoneCodeHash,
            phoneCode: code
        });
        res.json({ success: true, session: client.session.save() });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Backend läuft'));
