-- Script per correggere le policy RLS per la registrazione
-- Esegui questo nella console SQL di Supabase

-- 1. Elimina le policy esistenti
DROP POLICY IF EXISTS "Users can view own record" ON public.users;
DROP POLICY IF EXISTS "Users can update own record" ON public.users;
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
DROP POLICY IF EXISTS "Service role can do anything" ON public.users;

-- 2. Crea policy corrette
-- Policy per permettere al service role di fare tutto (per la registrazione)
CREATE POLICY "Enable service role access" 
ON public.users FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Policy per permettere agli utenti autenticati di vedere i propri dati
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Policy per permettere agli utenti autenticati di aggiornare i propri dati
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- 3. Verifica le policy create
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';
