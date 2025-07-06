-- Migrazione per aggiungere il campo customTopicAnalysisResults se non esiste già
-- Esegui questo comando nel SQL Editor di Supabase

-- Verifica se il campo esiste già e lo aggiunge solo se necessario
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'analyses' 
        AND column_name = 'customTopicAnalysisResults'
    ) THEN
        ALTER TABLE "analyses" ADD COLUMN "customTopicAnalysisResults" TEXT;
        
        -- Aggiungi un commento per documentare il campo
        COMMENT ON COLUMN "analyses"."customTopicAnalysisResults" IS 'JSON contenente i risultati delle ricerche di topic personalizzati, con struttura: {"searches": [{"query": "query_utente", "timestamp": "ISO_date", "results": {...}}]}';
        
        RAISE NOTICE 'Campo customTopicAnalysisResults aggiunto alla tabella analyses';
    ELSE
        RAISE NOTICE 'Campo customTopicAnalysisResults esiste già nella tabella analyses';
    END IF;
END $$;
