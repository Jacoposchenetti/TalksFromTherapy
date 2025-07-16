-- Script per verificare e correggere la struttura della tabella users

-- 1. Verifica la struttura attuale
\d users;

-- 2. Verifica i constraint attuali
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass;

-- 3. Verifica se esiste il foreign key verso auth.users
SELECT constraint_name, constraint_type, table_name, column_name, foreign_table_name, foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'users' AND tc.constraint_type = 'FOREIGN KEY';

-- 4. Se la tabella users non è corretta, ricrearla
-- ATTENZIONE: Questo eliminerà tutti i dati esistenti!
/*
DROP TABLE IF EXISTS public.users CASCADE;

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

-- Abilita RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di vedere solo i propri dati
CREATE POLICY "Users can view own record" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own record" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own record" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
*/
