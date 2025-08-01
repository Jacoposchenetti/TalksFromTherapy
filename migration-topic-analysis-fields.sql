-- Migrazione per aggiungere i campi per topic analysis se non esistono già
-- Esegui questo comando nel SQL Editor di Supabase

-- Verifica se i campi esistono già e li aggiunge solo se necessario
DO $$
BEGIN
    -- Aggiungi topicAnalysisTimestamp se non esiste
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'analyses' 
        AND column_name = 'topicAnalysisTimestamp'
    ) THEN
        ALTER TABLE "analyses" ADD COLUMN "topicAnalysisTimestamp" TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Campo topicAnalysisTimestamp aggiunto alla tabella analyses';
    ELSE
        RAISE NOTICE 'Campo topicAnalysisTimestamp esiste già nella tabella analyses';
    END IF;

    -- Aggiungi topicAnalysisVersion se non esiste
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'analyses' 
        AND column_name = 'topicAnalysisVersion'
    ) THEN
        ALTER TABLE "analyses" ADD COLUMN "topicAnalysisVersion" TEXT;
        RAISE NOTICE 'Campo topicAnalysisVersion aggiunto alla tabella analyses';
    ELSE
        RAISE NOTICE 'Campo topicAnalysisVersion esiste già nella tabella analyses';
    END IF;

    -- Aggiungi topicAnalysisLanguage se non esiste
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'analyses' 
        AND column_name = 'topicAnalysisLanguage'
    ) THEN
        ALTER TABLE "analyses" ADD COLUMN "topicAnalysisLanguage" TEXT;
        RAISE NOTICE 'Campo topicAnalysisLanguage aggiunto alla tabella analyses';
    ELSE
        RAISE NOTICE 'Campo topicAnalysisLanguage esiste già nella tabella analyses';
    END IF;

    -- Aggiungi customTopicAnalysisResults se non esiste
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'analyses' 
        AND column_name = 'customTopicAnalysisResults'
    ) THEN
        ALTER TABLE "analyses" ADD COLUMN "customTopicAnalysisResults" TEXT;
        RAISE NOTICE 'Campo customTopicAnalysisResults aggiunto alla tabella analyses';
    ELSE
        RAISE NOTICE 'Campo customTopicAnalysisResults esiste già nella tabella analyses';
    END IF;

    -- Crea indice per topicAnalysisTimestamp se non esiste
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'analyses' 
        AND indexname = 'analyses_topicAnalysisTimestamp_idx'
    ) THEN
        CREATE INDEX "analyses_topicAnalysisTimestamp_idx" ON "analyses"("topicAnalysisTimestamp");
        RAISE NOTICE 'Indice analyses_topicAnalysisTimestamp_idx creato';
    ELSE
        RAISE NOTICE 'Indice analyses_topicAnalysisTimestamp_idx esiste già';
    END IF;

END $$; 