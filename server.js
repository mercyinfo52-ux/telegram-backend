const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703;
const apiHash = 'e9c00af578a9de0253ef02337460498f';

// Client-Instanz global halten
const client = new TelegramClient(new StringSession(''), apiId, apiHash, { 
    connectionRetries: 5 
});

let phoneCodeHash = '';

// Client Verbindung initialisieren
(async () => {
    await client.connect();
    console.log("Verbunden mit Telegram.");
})();

app.post('/send-code', async (req, res) => {
    try {
        const result = await client.sendCode({
            apiId: apiId,
            apiHash: apiHash,
        }, req.body.phone);
        
        phoneCodeHash = result.phoneCodeHash;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/verify-code', async (req, res) => {
    try {
        // Die korrekte Struktur für das signIn Objekt in gramjs:
        // Wir übergeben das 'authKey' oder den 'phoneCode' direkt.
        // Das 'result' von sendCode (phoneCodeHash) ist hier essentiell.
        const user = await client.signIn({
            phoneNumber: req.body.phone,
            phoneCode: req.body.phoneCode,
            phoneCodeHash: phoneCodeHash
        });
        
        const sessionString = client.session.save();
        res.json({ success: true, session: sessionString });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Server läuft auf 3000.'));
