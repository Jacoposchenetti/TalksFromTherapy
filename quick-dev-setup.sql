-- SOLUZIONE RAPIDA: Elimina tutto e disabilita conferma email
-- Perfetto per sviluppo veloce

-- 1. Elimina tutti gli utenti esistenti
DELETE FROM auth.users;

-- 2. Elimina eventuali record in public.users (se esistono)
DELETE FROM public.users;

-- 3. Modifica il trigger per non richiedere conferma email
-- Modifica la funzione trigger per attivarsi subito alla registrazione
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
    false, -- Non ancora verificata
    COALESCE((NEW.raw_user_meta_data->>'consent_terms_accepted')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'consent_privacy_accepted')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'consent_date')::timestamp with time zone, NOW()),
    NEW.raw_user_meta_data->>'consent_ip_address'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Cambia il trigger per attivarsi subito alla registrazione (non alla conferma)
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ora quando ti registri, l'utente va subito in public.users senza conferma email!
