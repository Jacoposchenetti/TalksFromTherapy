-- Script per risolvere l'errore del trigger e eliminare utenti
-- Il problema è un trigger esistente con errore di casting

-- 1. Prima disabilita tutti i trigger esistenti su auth.users
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Elimina le funzioni trigger problematiche
DROP FUNCTION IF EXISTS public.handle_deleted_auth_user();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Ora puoi eliminare gli utenti senza problemi
DELETE FROM auth.users WHERE email = 'jacopo.schenetti@unitn.it';
DELETE FROM auth.users WHERE email = 'zioprice@gmail.com';
DELETE FROM auth.users WHERE email = 'jschenetti@gmail.com';

-- 4. OPPURE elimina tutti gli utenti non confermati
-- DELETE FROM auth.users WHERE email_confirmed_at IS NULL;

-- 5. Ricrea la funzione trigger corretta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    "licenseNumber",
    "emailVerified",
    "consent_terms_accepted",
    "consent_privacy_accepted",
    "consent_date",
    "consent_ip_address"
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'license_number',
    false,
    COALESCE((NEW.raw_user_meta_data->>'consent_terms_accepted')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'consent_privacy_accepted')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'consent_date')::timestamp with time zone, NOW()),
    NEW.raw_user_meta_data->>'consent_ip_address'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Ricrea trigger per registrazione immediata (senza conferma email)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Verifica che gli utenti siano stati eliminati
SELECT id, email, email_confirmed_at FROM auth.users;
