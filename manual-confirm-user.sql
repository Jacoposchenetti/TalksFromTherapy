-- Script per confermare manualmente un utente (solo per test)
-- Sostituisci 'EMAIL_DA_CONFERMARE' con la tua email

-- 1. Trova l'utente non confermato
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'EMAIL_DA_CONFERMARE' 
AND email_confirmed_at IS NULL;

-- 2. Conferma manualmente l'utente (sostituisci l'ID)
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'EMAIL_DA_CONFERMARE' 
AND email_confirmed_at IS NULL;

-- 3. Verifica che il trigger abbia popolato public.users
SELECT * FROM public.users WHERE email = 'EMAIL_DA_CONFERMARE';
