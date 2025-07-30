-- Test manuale aggiunta crediti
-- Simuliamo quello che farebbe il webhook

-- 1. Trova il tuo user_id (sostituisci con la tua email)
SELECT id, email FROM auth.users WHERE email = 'TUA_EMAIL_QUI';

-- 2. Aggiungi 300 crediti manualmente (simula acquisto pacchetto Base)
SELECT add_credits_atomic(
  'USER_ID_QUI',
  300,
  'purchase',
  'Test manuale - Pacchetto Base 300 crediti',
  'test_payment_intent_123'
);

-- 3. Verifica che i crediti siano stati aggiunti
SELECT * FROM user_credits WHERE user_id = 'USER_ID_QUI';

-- 4. Controlla la transazione
SELECT * FROM credit_transactions 
WHERE user_id = 'USER_ID_QUI' 
ORDER BY created_at DESC 
LIMIT 5;
