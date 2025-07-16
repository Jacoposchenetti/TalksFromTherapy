-- Script per eliminare completamente un utente da Supabase
-- ATTENZIONE: Cambia 'TUA_EMAIL_QUI' con la tua email reale

-- Prima elimina dalla tabella users personalizzata
DELETE FROM public.users WHERE email = 'TUA_EMAIL_QUI';

-- Poi elimina dalla tabella auth.users (richiede privilegi admin)
DELETE FROM auth.users WHERE email = 'TUA_EMAIL_QUI';

-- Verifica che sia stato eliminato
SELECT email FROM auth.users WHERE email = 'TUA_EMAIL_QUI';
-- Dovrebbe restituire 0 righe

SELECT email FROM public.users WHERE email = 'TUA_EMAIL_QUI';
-- Dovrebbe restituire 0 righe
