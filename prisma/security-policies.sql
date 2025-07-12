-- Security Policies per Supabase - Row Level Security (RLS)
-- Eseguire dopo aver creato le tabelle principali

-- Abilita RLS su tutte le tabelle sensibili
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analyses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transcription_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session_notes" ENABLE ROW LEVEL SECURITY;

-- Policy per users: ogni utente può accedere solo ai propri dati
CREATE POLICY "users_own_data" ON "users"
    FOR ALL
    USING (auth.uid()::text = id);

-- Policy per patients: ogni utente può accedere solo ai propri pazienti
CREATE POLICY "patients_own_data" ON "patients"
    FOR ALL
    USING (auth.uid()::text = "userId");

-- Policy per sessions: ogni utente può accedere solo alle proprie sessioni
CREATE POLICY "sessions_own_data" ON "sessions"
    FOR ALL
    USING (auth.uid()::text = "userId");

-- Policy per analyses: ogni utente può accedere solo alle proprie analisi
CREATE POLICY "analyses_own_data" ON "analyses"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "sessions" s 
            WHERE s.id = "analyses"."sessionId" 
            AND s."userId" = auth.uid()::text
        )
    );

-- Policy per transcription_jobs: ogni utente può accedere solo ai propri job
CREATE POLICY "transcription_jobs_own_data" ON "transcription_jobs"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "sessions" s 
            WHERE s.id = "transcription_jobs"."sessionId" 
            AND s."userId" = auth.uid()::text
        )
    );

-- Policy per session_notes: ogni utente può accedere solo alle proprie note
CREATE POLICY "session_notes_own_data" ON "session_notes"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "sessions" s 
            WHERE s.id = "session_notes"."sessionId" 
            AND s."userId" = auth.uid()::text
        )
    );

-- Policy per audit_logs: ogni utente può vedere solo i propri log
CREATE POLICY "audit_logs_own_data" ON "audit_logs"
    FOR SELECT
    USING (auth.uid()::text = "userId");

-- Policy per audit_logs: solo il sistema può inserire log
CREATE POLICY "audit_logs_system_insert" ON "audit_logs"
    FOR INSERT
    WITH CHECK (true); -- Il sistema può sempre inserire log
