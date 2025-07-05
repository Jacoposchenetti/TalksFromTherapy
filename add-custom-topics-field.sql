-- Aggiungi il campo per i topic personalizzati alla tabella analyses
-- Esegui questo comando nel SQL Editor di Supabase

ALTER TABLE "analyses" ADD COLUMN "customTopicAnalysisResults" TEXT;

-- Aggiungi un commento per documentare il campo
COMMENT ON COLUMN "analyses"."customTopicAnalysisResults" IS 'JSON contenente i risultati delle ricerche di topic personalizzati, con struttura: {"searches": [{"query": "query_utente", "timestamp": "ISO_date", "results": {...}}]}';
