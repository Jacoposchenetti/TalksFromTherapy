-- Soluzione temporanea: disabilita RLS per patients durante il debug
-- SOLO per sviluppo!

-- 1. Disabilita RLS sulla tabella patients
ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;

-- 2. Ora prova a creare un paziente dall'app
-- Dovrebbe funzionare

-- 3. Quando tutto funziona, riabilita RLS
-- ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
