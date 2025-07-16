-- Aggiungi policy per service role per patients
-- Così l'API può operare con service_role key

-- 1. Riabilita RLS (se disabilitato)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- 2. Elimina policy esistenti problematiche
DROP POLICY IF EXISTS "Users can access own patients" ON public.patients;
DROP POLICY IF EXISTS "Enable users to view own patients" ON public.patients;
DROP POLICY IF EXISTS "Enable users to insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Enable users to update own patients" ON public.patients;
DROP POLICY IF EXISTS "Enable users to delete own patients" ON public.patients;

-- 3. Crea policy per service role (per API calls)
CREATE POLICY "Enable service role to manage all patients" 
ON public.patients FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- 4. Crea policy per utenti autenticati
CREATE POLICY "Enable users to view own patients" 
ON public.patients FOR SELECT 
TO authenticated 
USING (auth.uid() = "userId");

CREATE POLICY "Enable users to insert own patients" 
ON public.patients FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Enable users to update own patients" 
ON public.patients FOR UPDATE 
TO authenticated 
USING (auth.uid() = "userId")
WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Enable users to delete own patients" 
ON public.patients FOR DELETE 
TO authenticated 
USING (auth.uid() = "userId");

-- 5. Verifica le policy
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'patients' AND schemaname = 'public';
