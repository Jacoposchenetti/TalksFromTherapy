-- Script per verificare se pg_cron è disponibile
-- Esegui questo nel SQL Editor di Supabase

-- 1. Verifica se pg_cron è installato
SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';

-- 2. Verifica se pg_cron è abilitato
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 3. Se non è installato, prova ad abilitarlo
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4. Verifica che funzioni
-- SELECT cron.schedule('test-job', '* * * * *', 'SELECT now();');
