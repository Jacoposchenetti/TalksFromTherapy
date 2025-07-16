-- Fix completo RLS policies per tutte le tabelle principali - VERSIONE FINALE
-- Esegui questo script in Supabase SQL Editor

-- Prima di tutto, disabilita temporaneamente RLS e rimuovi tutte le policy esistenti
ALTER TABLE IF EXISTS public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analyses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.session_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transcription_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patients DISABLE ROW LEVEL SECURITY;

-- Drop tutte le policy esistenti per tutti i ruoli
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Rimuovi tutte le policy dalle tabelle principali
    FOR r IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('patients', 'sessions', 'analyses', 'session_notes', 'transcription_jobs')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- 1. PATIENTS TABLE (già configurata correttamente)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Service role policies per patients
CREATE POLICY "Enable service role to manage all patients" 
ON public.patients FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- User policies per patients
CREATE POLICY "Enable users to view own patients" 
ON public.patients FOR SELECT 
TO authenticated 
USING (auth.uid() = public.patients."userId");

CREATE POLICY "Enable users to insert own patients" 
ON public.patients FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = public.patients."userId");

CREATE POLICY "Enable users to update own patients" 
ON public.patients FOR UPDATE 
TO authenticated 
USING (auth.uid() = public.patients."userId")
WITH CHECK (auth.uid() = public.patients."userId");

CREATE POLICY "Enable users to delete own patients" 
ON public.patients FOR DELETE 
TO authenticated 
USING (auth.uid() = public.patients."userId");

-- 2. SESSIONS TABLE
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Service role policies per sessions
CREATE POLICY "Enable service role to manage all sessions" 
ON public.sessions FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- User policies per sessions (usando virgolette per sicurezza)
CREATE POLICY "Enable users to view own sessions" 
ON public.sessions FOR SELECT 
TO authenticated 
USING (auth.uid() = public.sessions."userId");

CREATE POLICY "Enable users to insert own sessions" 
ON public.sessions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = public.sessions."userId");

CREATE POLICY "Enable users to update own sessions" 
ON public.sessions FOR UPDATE 
TO authenticated 
USING (auth.uid() = public.sessions."userId")
WITH CHECK (auth.uid() = public.sessions."userId");

CREATE POLICY "Enable users to delete own sessions" 
ON public.sessions FOR DELETE 
TO authenticated 
USING (auth.uid() = public.sessions."userId");

-- 3. ANALYSES TABLE (collegata tramite sessions.userId)
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Service role policies per analyses
CREATE POLICY "Enable service role to manage all analyses" 
ON public.analyses FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- User policies per analyses (attraverso relazione con sessions)
CREATE POLICY "Enable users to view own analyses" 
ON public.analyses FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE public.sessions.id = public.analyses."sessionId" 
    AND public.sessions."userId" = auth.uid()
  )
);

CREATE POLICY "Enable users to insert own analyses" 
ON public.analyses FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE public.sessions.id = public.analyses."sessionId" 
    AND public.sessions."userId" = auth.uid()
  )
);

CREATE POLICY "Enable users to update own analyses" 
ON public.analyses FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE public.sessions.id = public.analyses."sessionId" 
    AND public.sessions."userId" = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE public.sessions.id = public.analyses."sessionId" 
    AND public.sessions."userId" = auth.uid()
  )
);

CREATE POLICY "Enable users to delete own analyses" 
ON public.analyses FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE public.sessions.id = public.analyses."sessionId" 
    AND public.sessions."userId" = auth.uid()
  )
);

-- 4. SESSION_NOTES TABLE (collegata tramite sessions.userId)
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

-- Service role policies per session_notes
CREATE POLICY "Enable service role to manage all session_notes" 
ON public.session_notes FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- User policies per session_notes (attraverso relazione con sessions)
CREATE POLICY "Enable users to view own session_notes" 
ON public.session_notes FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE public.sessions.id = public.session_notes."sessionId" 
    AND public.sessions."userId" = auth.uid()
  )
);

CREATE POLICY "Enable users to insert own session_notes" 
ON public.session_notes FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE public.sessions.id = public.session_notes."sessionId" 
    AND public.sessions."userId" = auth.uid()
  )
);

CREATE POLICY "Enable users to update own session_notes" 
ON public.session_notes FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE public.sessions.id = public.session_notes."sessionId" 
    AND public.sessions."userId" = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE public.sessions.id = public.session_notes."sessionId" 
    AND public.sessions."userId" = auth.uid()
  )
);

CREATE POLICY "Enable users to delete own session_notes" 
ON public.session_notes FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE public.sessions.id = public.session_notes."sessionId" 
    AND public.sessions."userId" = auth.uid()
  )
);

-- 5. TRANSCRIPTION_JOBS TABLE (se esiste, collegata tramite sessions.userId)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transcription_jobs') THEN
        ALTER TABLE public.transcription_jobs ENABLE ROW LEVEL SECURITY;
        
        -- Service role policies per transcription_jobs
        CREATE POLICY "Enable service role to manage all transcription_jobs" 
        ON public.transcription_jobs FOR ALL 
        TO service_role
        USING (true) 
        WITH CHECK (true);
        
        -- User policies per transcription_jobs (attraverso relazione con sessions)
        CREATE POLICY "Enable users to view own transcription_jobs" 
        ON public.transcription_jobs FOR SELECT 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE public.sessions.id = public.transcription_jobs."sessionId" 
            AND public.sessions."userId" = auth.uid()
          )
        );
        
        CREATE POLICY "Enable users to insert own transcription_jobs" 
        ON public.transcription_jobs FOR INSERT 
        TO authenticated 
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE public.sessions.id = public.transcription_jobs."sessionId" 
            AND public.sessions."userId" = auth.uid()
          )
        );
        
        CREATE POLICY "Enable users to update own transcription_jobs" 
        ON public.transcription_jobs FOR UPDATE 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE public.sessions.id = public.transcription_jobs."sessionId" 
            AND public.sessions."userId" = auth.uid()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE public.sessions.id = public.transcription_jobs."sessionId" 
            AND public.sessions."userId" = auth.uid()
          )
        );
        
        CREATE POLICY "Enable users to delete own transcription_jobs" 
        ON public.transcription_jobs FOR DELETE 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE public.sessions.id = public.transcription_jobs."sessionId" 
            AND public.sessions."userId" = auth.uid()
          )
        );
    END IF;
END $$;

-- Verifica finale di tutte le policy create
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

-- Messaggio di conferma
SELECT 'RLS policies configurate correttamente per tutte le tabelle!' as status;
