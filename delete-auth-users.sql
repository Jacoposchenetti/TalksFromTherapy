-- Script per eliminare utenti da auth.users
-- ATTENZIONE: Questo elimina TUTTO l'utente da Supabase Auth

-- 1. Prima vedi tutti gli utenti esistenti
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- 2. Elimina utenti specifici per email (sostituisci con le tue email)
DELETE FROM auth.users WHERE email = 'jacopo.schenetti@unitn.it';
DELETE FROM auth.users WHERE email = 'zioprice@gmail.com';
DELETE FROM auth.users WHERE email = 'jschenetti@gmail.com';

-- 3. OPPURE elimina tutti gli utenti non confermati
DELETE FROM auth.users WHERE email_confirmed_at IS NULL;

-- 4. OPPURE elimina TUTTI gli utenti (se vuoi ricominciare da zero)
-- DELETE FROM auth.users;

-- 5. Verifica che siano stati eliminati
SELECT id, email, email_confirmed_at 
FROM auth.users;
