-- SOLUZIONE DEFINITIVA: Trigger automatico + RLS semplificato
-- Mantiene le foreign key ma elimina i problemi di sincronizzazione

-- 1. Prima elimina TUTTE le tabelle esistenti (CASCADE elimina anche le dipendenze)
DROP TABLE IF EXISTS public.analyses CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. Ricrea la tabella users con struttura corretta
CREATE TABLE public.users (
  id UUID PRIMARY KEY, -- NOTA: nessun DEFAULT, sarà impostato dal trigger
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

-- 3. Ricrea le tabelle che dipendono da users
-- Pazienti
CREATE TABLE "patients" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL, -- Cambiato da TEXT a UUID
  "initials" TEXT NOT NULL,
  "dateOfBirth" TIMESTAMP WITH TIME ZONE,
  "notes" TEXT,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "patients_userId_idx" ON "patients"("userId");

-- Sessioni
CREATE TABLE "sessions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL, -- Cambiato da TEXT a UUID
  "patientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "audioUrl" TEXT,
  "audioFileName" TEXT,
  "audioFileSize" INTEGER,
  "transcript" TEXT,
  "sessionDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  "duration" INTEGER,
  "status" TEXT DEFAULT 'UPLOADED',
  "errorMessage" TEXT,
  "documentMetadata" TEXT,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "sessions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE
);
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_patientId_idx" ON "sessions"("patientId");

-- Analisi
CREATE TABLE "analyses" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" TEXT UNIQUE NOT NULL,
  "patientId" TEXT NOT NULL,
  -- Sentiment Analysis
  "sentimentScore" DOUBLE PRECISION,
  "emotions" TEXT,
  "emotionFlowerPlot" TEXT,
  "emotionalValence" DOUBLE PRECISION,
  "significantEmotions" TEXT,
  -- Topic Analysis
  "keyTopics" TEXT,
  "topicAnalysisResult" TEXT,
  "customTopicAnalysisResults" TEXT,
  -- Semantic Frame Analysis
  "semanticFrameResults" TEXT,
  -- General Analysis Fields
  "therapeuticGoals" TEXT,
  "progressNotes" TEXT,
  "summary" TEXT,
  "confidenceScore" DOUBLE PRECISION,
  "processingTime" INTEGER,
  -- Metadata
  "analysisVersion" TEXT,
  "language" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analyses_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE,
  CONSTRAINT "analyses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE
);
CREATE INDEX "analyses_patientId_idx" ON "analyses"("patientId");
CREATE INDEX "analyses_createdAt_idx" ON "analyses"("createdAt");

-- 4. Funzione trigger che popola users automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    "licenseNumber",
    "emailVerified",
    "consent_terms_accepted",
    "consent_privacy_accepted",
    "consent_date",
    "consent_ip_address"
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'license_number',
    NEW.email_confirmed_at IS NOT NULL,
    COALESCE((NEW.raw_user_meta_data->>'consent_terms_accepted')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'consent_privacy_accepted')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'consent_date')::timestamp with time zone, NOW()),
    NEW.raw_user_meta_data->>'consent_ip_address'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger che si attiva quando l'email viene confermata
CREATE OR REPLACE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- 6. RLS policy semplici
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 7. Policy per le altre tabelle
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own patients" 
ON public.patients FOR ALL 
TO authenticated 
USING (auth.uid() = "userId");

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own sessions" 
ON public.sessions FOR ALL 
TO authenticated 
USING (auth.uid() = "userId");

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own analyses" 
ON public.analyses FOR ALL 
TO authenticated 
USING (auth.uid() IN (
  SELECT "userId" FROM public.sessions WHERE "sessions"."id" = "analyses"."sessionId"
));
