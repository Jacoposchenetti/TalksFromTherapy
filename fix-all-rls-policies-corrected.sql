-- Fix completo RLS policies per tutte le tabelle principali - VERSIONE CORRETTA
-- Esegui questo script in Supabase SQL Editor

-- 1. SESSIONS TABLE
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can access own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Enable users to view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Enable users to insert own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Enable users to update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Enable users to delete own sessions" ON public.sessions;

-- Service role policies
CREATE POLICY "Enable service role to manage all sessions" 
ON public.sessions FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- User policies (nomi colonne corretti senza virgolette)
CREATE POLICY "Enable users to view own sessions" 
ON public.sessions FOR SELECT 
TO authenticated 
USING (auth.uid() = sessions.userId);

CREATE POLICY "Enable users to insert own sessions" 
ON public.sessions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = sessions.userId);

CREATE POLICY "Enable users to update own sessions" 
ON public.sessions FOR UPDATE 
TO authenticated 
USING (auth.uid() = sessions.userId)
WITH CHECK (auth.uid() = sessions.userId);

CREATE POLICY "Enable users to delete own sessions" 
ON public.sessions FOR DELETE 
TO authenticated 
USING (auth.uid() = sessions.userId);

-- 2. ANALYSES TABLE
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can access own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Enable users to view own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Enable users to insert own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Enable users to update own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Enable users to delete own analyses" ON public.analyses;

-- Service role policies
CREATE POLICY "Enable service role to manage all analyses" 
ON public.analyses FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- User policies (through sessions relationship)
CREATE POLICY "Enable users to view own analyses" 
ON public.analyses FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = analyses.sessionId 
    AND sessions.userId = auth.uid()
  )
);

CREATE POLICY "Enable users to insert own analyses" 
ON public.analyses FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = analyses.sessionId 
    AND sessions.userId = auth.uid()
  )
);

CREATE POLICY "Enable users to update own analyses" 
ON public.analyses FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = analyses.sessionId 
    AND sessions.userId = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = analyses.sessionId 
    AND sessions.userId = auth.uid()
  )
);

CREATE POLICY "Enable users to delete own analyses" 
ON public.analyses FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = analyses.sessionId 
    AND sessions.userId = auth.uid()
  )
);

-- 3. SESSION_NOTES TABLE
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can access own session_notes" ON public.session_notes;
DROP POLICY IF EXISTS "Enable users to view own session_notes" ON public.session_notes;
DROP POLICY IF EXISTS "Enable users to insert own session_notes" ON public.session_notes;
DROP POLICY IF EXISTS "Enable users to update own session_notes" ON public.session_notes;
DROP POLICY IF EXISTS "Enable users to delete own session_notes" ON public.session_notes;

-- Service role policies
CREATE POLICY "Enable service role to manage all session_notes" 
ON public.session_notes FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- User policies (through sessions relationship)
CREATE POLICY "Enable users to view own session_notes" 
ON public.session_notes FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = session_notes.sessionId 
    AND sessions.userId = auth.uid()
  )
);

CREATE POLICY "Enable users to insert own session_notes" 
ON public.session_notes FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = session_notes.sessionId 
    AND sessions.userId = auth.uid()
  )
);

CREATE POLICY "Enable users to update own session_notes" 
ON public.session_notes FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = session_notes.sessionId 
    AND sessions.userId = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = session_notes.sessionId 
    AND sessions.userId = auth.uid()
  )
);

CREATE POLICY "Enable users to delete own session_notes" 
ON public.session_notes FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = session_notes.sessionId 
    AND sessions.userId = auth.uid()
  )
);

-- 4. TRANSCRIPTION_JOBS TABLE (con nomi colonne corretti)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transcription_jobs') THEN
        ALTER TABLE public.transcription_jobs ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can access own transcription_jobs" ON public.transcription_jobs;
        DROP POLICY IF EXISTS "Enable users to view own transcription_jobs" ON public.transcription_jobs;
        DROP POLICY IF EXISTS "Enable users to insert own transcription_jobs" ON public.transcription_jobs;
        DROP POLICY IF EXISTS "Enable users to update own transcription_jobs" ON public.transcription_jobs;
        DROP POLICY IF EXISTS "Enable users to delete own transcription_jobs" ON public.transcription_jobs;
        
        -- Service role policies
        CREATE POLICY "Enable service role to manage all transcription_jobs" 
        ON public.transcription_jobs FOR ALL 
        TO service_role
        USING (true) 
        WITH CHECK (true);
        
        -- User policies (attraverso relazione con sessions)
        CREATE POLICY "Enable users to view own transcription_jobs" 
        ON public.transcription_jobs FOR SELECT 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE sessions.id = transcription_jobs.sessionId 
            AND sessions.userId = auth.uid()
          )
        );
        
        CREATE POLICY "Enable users to insert own transcription_jobs" 
        ON public.transcription_jobs FOR INSERT 
        TO authenticated 
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE sessions.id = transcription_jobs.sessionId 
            AND sessions.userId = auth.uid()
          )
        );
        
        CREATE POLICY "Enable users to update own transcription_jobs" 
        ON public.transcription_jobs FOR UPDATE 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE sessions.id = transcription_jobs.sessionId 
            AND sessions.userId = auth.uid()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE sessions.id = transcription_jobs.sessionId 
            AND sessions.userId = auth.uid()
          )
        );
        
        CREATE POLICY "Enable users to delete own transcription_jobs" 
        ON public.transcription_jobs FOR DELETE 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE sessions.id = transcription_jobs.sessionId 
            AND sessions.userId = auth.uid()
          )
        );
    END IF;
END $$;

-- Verifica tutte le policy create
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('patients', 'sessions', 'analyses', 'session_notes', 'transcription_jobs')
ORDER BY tablename, policyname;
