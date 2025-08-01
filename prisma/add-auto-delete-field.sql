-- Aggiunta del campo isAutoDelete alla tabella sessions
-- Eseguire nel SQL Editor di Supabase

-- Aggiungi la colonna isAutoDelete alla tabella sessions
ALTER TABLE "sessions" 
ADD COLUMN "isAutoDelete" BOOLEAN DEFAULT FALSE;

-- Aggiungi un indice per performance
CREATE INDEX "sessions_isAutoDelete_idx" ON "sessions"("isAutoDelete");

-- Aggiungi un commento per documentare il campo
COMMENT ON COLUMN "sessions"."isAutoDelete" IS 'Flag che indica se la sessione deve essere automaticamente eliminata dopo la trascrizione (per registrazioni dal microfono)';
