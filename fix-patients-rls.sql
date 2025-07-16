-- Correggi le policy RLS per la tabella patients
-- Il problema è probabilmente nel confronto tra auth.uid() e userId

-- 1. Verifica la struttura della tabella patients
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' AND table_schema = 'public';

-- 2. Verifica le policy esistenti
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'patients' AND schemaname = 'public';

-- 3. Elimina le policy esistenti problematiche
DROP POLICY IF EXISTS "Users can access own patients" ON public.patients;

-- 4. Crea policy corrette per patients
-- Policy per SELECT (visualizzare i propri pazienti)
CREATE POLICY "Enable users to view own patients" 
ON public.patients FOR SELECT 
TO authenticated 
USING (auth.uid() = "userId");

-- Policy per INSERT (creare nuovi pazienti)
CREATE POLICY "Enable users to insert own patients" 
ON public.patients FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = "userId");

-- Policy per UPDATE (modificare i propri pazienti)
CREATE POLICY "Enable users to update own patients" 
ON public.patients FOR UPDATE 
TO authenticated 
USING (auth.uid() = "userId")
WITH CHECK (auth.uid() = "userId");

-- Policy per DELETE (eliminare i propri pazienti)
CREATE POLICY "Enable users to delete own patients" 
ON public.patients FOR DELETE 
TO authenticated 
USING (auth.uid() = "userId");

-- 5. Verifica che le policy siano state create
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'patients' AND schemaname = 'public';
