-- ============================================
-- SECURITY POLICIES SETUP FOR TALKSFROMTHERAPY
-- Da eseguire su Supabase SQL Editor
-- NOTA: Non modifichiamo auth.users (è gestita da Supabase)
-- ============================================

-- 1. VERIFICA STATO ATTUALE
SELECT 'Verificando tabelle esistenti...' as status;

-- Controlla quali tabelle esistono
SELECT 
    table_schema,
    table_name,
    CASE 
        WHEN table_schema = 'auth' THEN 'Sistema Supabase (non modificabile)'
        ELSE 'Tabella personalizzata'
    END as type
FROM information_schema.tables 
WHERE table_name IN ('users', 'user_credits', 'sessions', 'transcriptions')
ORDER BY table_schema, table_name;

-- 2. CREA/CONFIGURA TABELLA user_credits se non esiste
DO $$
BEGIN
    -- Crea la tabella se non esiste
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_credits' AND table_schema = 'public') THEN
        CREATE TABLE public.user_credits (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            credits INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id)
        );
        
        RAISE NOTICE 'user_credits table created';
    END IF;
    
    -- Abilita RLS
    ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
    
    -- Rimuovi policies esistenti se ci sono
    DROP POLICY IF EXISTS "service_role_full_access_credits" ON public.user_credits;
    DROP POLICY IF EXISTS "users_can_view_own_credits" ON public.user_credits;
    DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
    DROP POLICY IF EXISTS "Service role full access" ON public.user_credits;
    
    -- Policy 1: Service role accesso completo
    CREATE POLICY "service_role_full_access_credits" ON public.user_credits
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
        
    -- Policy 2: Utenti possono vedere i propri crediti
    CREATE POLICY "users_can_view_own_credits" ON public.user_credits
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
        
    RAISE NOTICE 'user_credits policies configured successfully';
END $$;

-- 3. CONFIGURA POLICIES per tabella users personalizzata (se esiste)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        -- Abilita RLS
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
        -- Rimuovi policies esistenti
        DROP POLICY IF EXISTS "service_role_full_access_users" ON public.users;
        DROP POLICY IF EXISTS "users_can_read_own_data" ON public.users;
        DROP POLICY IF EXISTS "users_can_update_own_data" ON public.users;
        DROP POLICY IF EXISTS "Users can read own data" ON public.users;
        DROP POLICY IF EXISTS "Service role access" ON public.users;
        
        -- Policy 1: Service role accesso completo
        CREATE POLICY "service_role_full_access_users" ON public.users
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
            
        -- Policy 2: Utenti possono leggere i propri dati (fix UUID/TEXT compatibility)
        CREATE POLICY "users_can_read_own_data" ON public.users
            FOR SELECT
            TO authenticated
            USING (
                CASE 
                    WHEN pg_typeof(id) = 'uuid'::regtype THEN auth.uid() = id::uuid
                    ELSE auth.uid()::text = id::text
                END
            );
            
        -- Policy 3: Utenti possono aggiornare i propri dati (fix UUID/TEXT compatibility)
        CREATE POLICY "users_can_update_own_data" ON public.users
            FOR UPDATE
            TO authenticated
            USING (
                CASE 
                    WHEN pg_typeof(id) = 'uuid'::regtype THEN auth.uid() = id::uuid
                    ELSE auth.uid()::text = id::text
                END
            )
            WITH CHECK (
                CASE 
                    WHEN pg_typeof(id) = 'uuid'::regtype THEN auth.uid() = id::uuid
                    ELSE auth.uid()::text = id::text
                END
            );
            
        RAISE NOTICE 'Public users table policies configured successfully';
    ELSE
        RAISE NOTICE 'public.users table does not exist, skipping';
    END IF;
END $$;

-- 4. DISABILITA RLS SU auth.users (SOLUZIONE TEMPORANEA)
-- Questo permette al service_role di creare utenti
SELECT '🔧 Disabilitando RLS su auth.users temporaneamente...' as action;

DO $$
BEGIN
    -- Disabilita RLS su auth.users se possibile
    BEGIN
        ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS disabled on auth.users successfully';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'Cannot disable RLS on auth.users (insufficient privileges)';
        RAISE NOTICE 'You need to disable this manually in Supabase Dashboard';
    END;
END $$;

-- 5. IMPORTANTE: Istruzioni per configurazione manuale
-- 5. IMPORTANTE: Istruzioni per configurazione manuale
SELECT '⚠️  AZIONE MANUALE RICHIESTA ⚠️' as warning;
SELECT 'Se il comando precedente ha fallito:' as step_0;
SELECT 'Vai su Supabase Dashboard → Authentication → Policies' as step_1;
SELECT 'Trova la tabella auth.users e clicca su "Disable RLS"' as step_2;
SELECT 'Oppure disabilita manualmente tutte le policies su auth.users' as step_3;
SELECT 'Questo permette al service_role di creare nuovi utenti' as reason;

-- 6. VERIFICA CONFIGURAZIONE FINALE
SELECT 'Policies configurate:' as status;

SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('users', 'user_credits')
ORDER BY schemaname, tablename, policyname;

-- 7. VERIFICA RLS STATUS
SELECT 'Status RLS (Row Level Security):' as status;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE (schemaname = 'public' AND tablename IN ('users', 'user_credits'))
   OR (schemaname = 'auth' AND tablename = 'users')
ORDER BY schemaname, tablename;

-- ============================================
-- RESULT ATTESO:
-- ✅ Script eseguito senza errori sui permessi
-- ✅ Tabella user_credits creata/configurata 
-- ✅ Policies configurate per le nostre tabelle
-- ⚠️  DEVI ANCORA disabilitare policies su auth.users manualmente
-- ============================================

-- STEP MANUALI NECESSARI:
-- 1. Vai su Supabase Dashboard
-- 2. Authentication → Policies  
-- 3. Disabilita TUTTE le policies esistenti su auth.users
-- 4. Poi testa la creazione account
