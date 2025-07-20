-- Fix RLS policy for avatar upload
-- Questo script risolve il problema di upload dell'avatar

-- 1. Verifica policy esistenti sulla tabella users
SELECT policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users';

-- 2. Rimuovi policy esistenti che potrebbero essere in conflitto
DROP POLICY IF EXISTS "Service role can do anything" ON public.users;
DROP POLICY IF EXISTS "Users can update own record" ON public.users;

-- 3. Ricrea policy per aggiornamenti utente
CREATE POLICY "Users can update own record" 
ON public.users FOR UPDATE 
USING (auth.uid()::text = id::text);

-- 4. Aggiungi policy specifica per service role (per NextAuth + avatar upload)
CREATE POLICY "Service role full access"
ON public.users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Policy per permettere aggiornamenti tramite JWT
CREATE POLICY "Allow avatar updates via service"
ON public.users FOR UPDATE
USING (true)
WITH CHECK (true);

-- 6. Verifica che RLS sia abilitato
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 7. Verifica policy finali
SELECT policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users';
