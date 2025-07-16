-- Script di debug per capire il problema RLS
-- Esegui questo per vedere cosa restituisce auth.uid()

-- 1. Controlla cosa restituisce auth.uid() per l'utente loggato
SELECT auth.uid() as current_user_id, auth.role() as current_role;

-- 2. Verifica il tipo di dati della colonna userId in patients
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'patients' AND column_name = 'userId';

-- 3. Verifica se ci sono record in patients e i loro userId
SELECT id, "userId", initials, "createdAt"
FROM public.patients
LIMIT 5;

-- 4. Test di inserimento manuale (per debug)
-- Sostituisci con il tuo user ID reale
INSERT INTO public.patients (
  "userId",
  initials,
  "isActive"
) VALUES (
  auth.uid(),
  'TEST',
  true
);

-- 5. Se l'inserimento sopra fallisce, prova con cast esplicito
-- INSERT INTO public.patients (
--   "userId", 
--   initials,
--   "isActive"
-- ) VALUES (
--   auth.uid()::uuid,
--   'TEST2',
--   true
-- );
