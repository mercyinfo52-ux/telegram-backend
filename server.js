app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code, phoneCodeHash, password } = req.body;
        const session = activeSessions.get(phone);
        if (!session) return res.status(400).json({ error: "Session abgelaufen" });

        // Falls Passwort gebraucht wird
        if (password) {
            await session.client.invoke(new Api.auth.CheckPassword({
                password: new Api.InputCheckPasswordSRP({
                    srp_id: session.passwordSrp.srpId,
                    A: session.passwordSrp.A,
                    M1: session.passwordSrp.M1
                })
            }));
            return res.json({ success: true });
        }

        // Normaler Login-Versuch
        try {
            await session.client.invoke(new Api.auth.SignIn({
                phoneNumber: phone,
                phoneCode: code,
                phoneCodeHash: phoneCodeHash
            }));
            res.json({ success: true });
        } catch (e) {
            // Wenn 2FA aktiv ist, Telegram liefert Details für das Passwort-SRP zurück
            if (e.message.includes('SESSION_PASSWORD_NEEDED')) {
                // Wir speichern den Zustand, dass das Passwort fehlt
                res.status(401).json({ error: "PASSWORD_NEEDED" });
            } else {
                throw e;
            }
        }
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
