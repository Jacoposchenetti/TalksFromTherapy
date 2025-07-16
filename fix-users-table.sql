-- Script per ricreare la tabella users compatibile con Supabase Auth
-- Esegui questo script nella console SQL di Supabase

-- 1. Elimina la tabella esistente se c'è (ATTENZIONE: perdi tutti i dati!)
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. Crea la tabella users collegata a auth.users
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  "licenseNumber" TEXT,
  "emailVerified" BOOLEAN DEFAULT FALSE,
  "consent_terms_accepted" BOOLEAN DEFAULT FALSE,
  "consent_privacy_accepted" BOOLEAN DEFAULT FALSE,
  "consent_date" TIMESTAMP WITH TIME ZONE,
  "consent_ip_address" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Abilita Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Crea le policy di sicurezza
CREATE POLICY "Users can view own record" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own record" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own record" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 5. Permetti al service role di fare tutto (per la registrazione)
CREATE POLICY "Service role can do anything"
ON public.users FOR ALL
USING (current_user = 'service_role');

-- 6. Verifica la struttura (query compatibile con Supabase)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;
