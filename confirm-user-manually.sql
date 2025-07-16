-- Conferma manualmente l'utente nella tabella public.users
-- Sostituisci 'TUA_EMAIL' con la tua email registrata

UPDATE public.users 
SET "emailVerified" = true,
    "updatedAt" = NOW()
WHERE email = 'TUA_EMAIL' 
AND "emailVerified" = false;

-- Verifica che sia stato aggiornato
SELECT email, "emailVerified", "createdAt", "updatedAt" 
FROM public.users 
WHERE email = 'TUA_EMAIL';
