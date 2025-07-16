-- Prima controlliamo la struttura delle tabelle per i nomi corretti delle colonne
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('patients', 'sessions', 'analyses', 'session_notes', 'transcription_jobs')
ORDER BY table_name, ordinal_position;
