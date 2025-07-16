-- Script per creare un trigger automatico per inserire utenti
-- Questo elimina il problema del foreign key constraint e RLS
-- Esegui questo nella console SQL di Supabase

-- 1. Prima disabilita RLS temporaneamente per testare
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Crea una funzione per gestire i nuovi utenti
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
    COALESCE(NEW.raw_user_meta_data->>'license_number', NULL),
    NEW.email_confirmed_at IS NOT NULL,
    COALESCE((NEW.raw_user_meta_data->>'consent_terms_accepted')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'consent_privacy_accepted')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'consent_date')::timestamptz, NOW()),
    COALESCE(NEW.raw_user_meta_data->>'consent_ip_address', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crea il trigger che si attiva quando un utente viene inserito in auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Crea una funzione per aggiornare emailVerified quando viene confermato
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.users 
    SET "emailVerified" = true 
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Crea il trigger per l'aggiornamento email confermata
CREATE OR REPLACE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();

-- 6. Riabilita RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
