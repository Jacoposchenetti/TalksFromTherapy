@echo off
echo 🚀 Testing Stripe Webhook Integration
echo.
echo ISTRUZIONI:
echo 1. Vai su https://dashboard.stripe.com/test/webhooks
echo 2. Clicca "Add endpoint"
echo 3. URL: http://localhost:3000/api/stripe/webhook
echo 4. Eventi da ascoltare:
echo    - checkout.session.completed
echo    - payment_intent.succeeded
echo 5. Copia il webhook secret e sostituisci nel .env.local
echo.
echo Dopo aver configurato il webhook:
echo 1. Riavvia il server di sviluppo (npm run dev)
echo 2. Effettua un pagamento di test
echo 3. Controlla i log del webhook nella dashboard Stripe
echo.
echo TESTING:
echo - Usa la carta di test: 4242 4242 4242 4242
echo - CVV: qualsiasi 3 cifre
echo - Data: qualsiasi data futura
echo.
pause
