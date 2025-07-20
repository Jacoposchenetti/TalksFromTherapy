-- Aggiungi colonna image alla tabella users per gli avatar
-- Questo script aggiunge il supporto per le immagini profilo

-- 1. Verifica struttura attuale della tabella users
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Aggiungi la colonna image se non esiste
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS image TEXT;

-- 3. Aggiungi commento alla colonna
COMMENT ON COLUMN public.users.image IS 'URL dell''immagine profilo dell''utente';

-- 4. Verifica che la colonna sia stata aggiunta
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public' AND column_name = 'image';

-- 5. Opzionale: aggiorna alcuni record di test (rimuovi se non necessario)
-- UPDATE public.users SET image = NULL WHERE image IS NULL;

SELECT 'Colonna image aggiunta con successo alla tabella users' as result;
