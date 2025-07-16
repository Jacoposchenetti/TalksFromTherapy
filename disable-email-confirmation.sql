-- Disabilita temporaneamente la conferma email per sviluppo
-- ATTENZIONE: Usa solo in sviluppo, mai in produzione!

-- Aggiorna le impostazioni di Supabase per non richiedere conferma email
-- Questo script va eseguito solo se vuoi disabilitare completamente la conferma

-- Opzione 1: Conferma tutti gli utenti esistenti
UPDATE auth.users 
SET email_confirmed_at = created_at,
    updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Opzione 2: Modifica le impostazioni per nuovi utenti
-- (Questo va fatto dalla dashboard di Supabase)
-- Authentication → Settings → "Enable email confirmations" = OFF
