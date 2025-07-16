-- Soluzione con trigger: sincronizzazione automatica
-- La tabella users si popola automaticamente quando l'utente conferma l'email

-- 1. Disabilita temporaneamente RLS per il trigger
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Crea funzione trigger
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
    NEW.email_confirmed_at IS NOT NULL,
    COALESCE((NEW.raw_user_meta_data->>'consent_terms_accepted')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'consent_privacy_accepted')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'consent_date')::timestamp with time zone, NOW()),
    NEW.raw_user_meta_data->>'consent_ip_address'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crea trigger che si attiva quando un utente conferma l'email
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Riabilita RLS con policy semplificate
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);
