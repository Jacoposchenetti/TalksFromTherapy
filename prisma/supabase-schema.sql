-- Script SQL per Supabase/Postgres generato da schema Prisma
-- Incolla questo script nel SQL Editor di Supabase

-- Tabella utenti
CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "licenseNumber" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabella pazienti
CREATE TABLE "patients" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "initials" TEXT NOT NULL,
  "dateOfBirth" TIMESTAMP WITH TIME ZONE,
  "notes" TEXT,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "patients_userId_idx" ON "patients"("userId");

-- Tabella sessioni
CREATE TABLE "sessions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
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
CREATE INDEX "sessions_sessionDate_idx" ON "sessions"("sessionDate");
CREATE INDEX "sessions_status_idx" ON "sessions"("status");

-- Tabella analisi
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

-- Tabella transcription_jobs
CREATE TABLE "transcription_jobs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" TEXT UNIQUE NOT NULL,
  "jobId" TEXT,
  "status" TEXT DEFAULT 'PENDING',
  "provider" TEXT DEFAULT 'openai',
  "startedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP WITH TIME ZONE,
  "errorMessage" TEXT,
  "retryCount" INTEGER DEFAULT 0,
  "metadata" TEXT,
  CONSTRAINT "transcription_jobs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE
);
CREATE INDEX "transcription_jobs_status_idx" ON "transcription_jobs"("status");
CREATE INDEX "transcription_jobs_startedAt_idx" ON "transcription_jobs"("startedAt");

-- Tabella audit_logs
CREATE TABLE "audit_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" TEXT,
  "oldValues" TEXT,
  "newValues" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resource");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- Tabella session_notes
CREATE TABLE "session_notes" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" TEXT UNIQUE NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_notes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE
);
CREATE INDEX "session_notes_sessionId_idx" ON "session_notes"("sessionId"); 