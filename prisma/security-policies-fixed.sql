-- Fix per le RLS policies - Permette registrazione nuovi utenti
-- Eseguire nel SQL Editor di Supabase

-- 1. Elimina le policy esistenti problematiche
DROP POLICY IF EXISTS "users_own_data" ON "users";
DROP POLICY IF EXISTS "patients_own_data" ON "patients";
DROP POLICY IF EXISTS "sessions_own_data" ON "sessions";
DROP POLICY IF EXISTS "analyses_own_data" ON "analyses";
DROP POLICY IF EXISTS "transcription_jobs_own_data" ON "transcription_jobs";
DROP POLICY IF EXISTS "session_notes_own_data" ON "session_notes";
DROP POLICY IF EXISTS "audit_logs_own_data" ON "audit_logs";
DROP POLICY IF EXISTS "audit_logs_system_insert" ON "audit_logs";

-- 2. Disabilita temporaneamente RLS per permettere la registrazione
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "patients" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "analyses" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "transcription_jobs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "session_notes" DISABLE ROW LEVEL SECURITY;

-- 3. Policy corrette per users (permette INSERT durante registrazione)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Policy per SELECT/UPDATE/DELETE: solo dati propri
CREATE POLICY "users_select_own_data" ON "users"
    FOR SELECT
    USING (auth.uid()::text = id);

CREATE POLICY "users_update_own_data" ON "users"
    FOR UPDATE
    USING (auth.uid()::text = id);

CREATE POLICY "users_delete_own_data" ON "users"
    FOR DELETE
    USING (auth.uid()::text = id);

-- Policy per INSERT: permette la registrazione
CREATE POLICY "users_insert_registration" ON "users"
    FOR INSERT
    WITH CHECK (true); -- Permette inserimento durante registrazione

-- 4. Policy corrette per le altre tabelle
ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_own_data" ON "patients"
    FOR ALL
    USING (auth.uid()::text = "userId");

ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_own_data" ON "sessions"
    FOR ALL
    USING (auth.uid()::text = "userId");

ALTER TABLE "analyses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analyses_own_data" ON "analyses"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "sessions" s 
            WHERE s.id = "analyses"."sessionId" 
            AND s."userId" = auth.uid()::text
        )
    );

ALTER TABLE "transcription_jobs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transcription_jobs_own_data" ON "transcription_jobs"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "sessions" s 
            WHERE s.id = "transcription_jobs"."sessionId" 
            AND s."userId" = auth.uid()::text
        )
    );

ALTER TABLE "session_notes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_notes_own_data" ON "session_notes"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "sessions" s 
            WHERE s.id = "session_notes"."sessionId" 
            AND s."userId" = auth.uid()::text
        )
    );

-- 5. Policy per audit_logs (leggere solo propri log, inserire sempre)
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_select_own_data" ON "audit_logs"
    FOR SELECT
    USING (auth.uid()::text = "userId");

CREATE POLICY "audit_logs_insert_any" ON "audit_logs"
    FOR INSERT
    WITH CHECK (true); -- Sistema può sempre inserire log
