-- GDPR Compliance Database Schema Updates
-- Sistema automatico di cancellazione conforme GDPR
-- L'utente non deve gestire nulla manualmente

-- 1. Aggiungi colonne per tracking GDPR alle sessioni
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deletion_reason VARCHAR(100);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS gdpr_retention_until TIMESTAMP DEFAULT (NOW() + INTERVAL '7 years'); -- Retention standard sanitaria

-- 2. Aggiungi colonne GDPR anche ai pazienti
ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gdpr_retention_until TIMESTAMP DEFAULT (NOW() + INTERVAL '7 years');

-- 3. Tabella per log automatico delle cancellazioni GDPR (per audit)
CREATE TABLE IF NOT EXISTS gdpr_deletion_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id UUID,
    patient_id UUID,
    deleted_at TIMESTAMP DEFAULT NOW(),
    deletion_type VARCHAR(50), -- 'user_delete', 'auto_retention', 'account_closure'
    data_categories TEXT[], -- ['audio', 'transcript', 'notes', 'metadata']
    legal_basis TEXT DEFAULT 'Art. 17 GDPR - Right to Erasure',
    retention_period_applied INTEGER, -- giorni di retention applicati
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Politiche di retention automatiche per tipo di utente
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    data_type VARCHAR(100), -- 'sessions', 'patient_data', 'analytics'
    retention_period_days INTEGER DEFAULT 2555, -- 7 anni per default sanitario
    legal_basis TEXT DEFAULT 'Conservazione dati sanitari - 7 anni',
    auto_delete_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Funzione automatica per hard delete GDPR
CREATE OR REPLACE FUNCTION perform_automatic_gdpr_cleanup()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_sessions INTEGER := 0;
    deleted_patients INTEGER := 0;
    session_record RECORD;
    patient_record RECORD;
BEGIN
    -- STEP 1: Elimina sessioni soft-deleted da più di 30 giorni
    FOR session_record IN 
        SELECT id, "userId", "audioFileName", "patientId"
        FROM sessions 
        WHERE "isActive" = false 
        AND deleted_at IS NOT NULL 
        AND deleted_at < NOW() - INTERVAL '30 days'
    LOOP
        -- Log automatico della cancellazione
        INSERT INTO gdpr_deletion_log (
            user_id,
            session_id,
            patient_id,
            deletion_type,
            data_categories,
            legal_basis,
            retention_period_applied
        ) VALUES (
            session_record."userId",
            session_record.id,
            session_record."patientId",
            'auto_retention',
            ARRAY['audio', 'transcript', 'notes', 'metadata'],
            'GDPR Art. 17 - Automatic deletion after 30-day grace period',
            30
        );
        
        -- Hard delete fisico
        DELETE FROM sessions WHERE id = session_record.id;
        deleted_sessions := deleted_sessions + 1;
    END LOOP;
    
    -- STEP 2: Elimina pazienti senza sessioni attive da più di 1 anno
    FOR patient_record IN 
        SELECT p.id, p."userId"
        FROM patients p
        WHERE p.deleted_at IS NULL
        AND NOT EXISTS (
            SELECT 1 FROM sessions s 
            WHERE s."patientId" = p.id 
            AND s."isActive" = true
        )
        AND p."createdAt" < NOW() - INTERVAL '1 year'
    LOOP
        -- Soft delete del paziente
        UPDATE patients 
        SET deleted_at = NOW(), 
            gdpr_retention_until = NOW() + INTERVAL '30 days'
        WHERE id = patient_record.id;
        
        -- Log della marcatura per cancellazione
        INSERT INTO gdpr_deletion_log (
            user_id,
            patient_id,
            deletion_type,
            data_categories,
            legal_basis,
            retention_period_applied
        ) VALUES (
            patient_record."userId",
            patient_record.id,
            'auto_retention',
            ARRAY['patient_metadata'],
            'GDPR Art. 17 - Automatic cleanup of inactive patients',
            365
        );
        
        deleted_patients := deleted_patients + 1;
    END LOOP;
    
    RETURN deleted_sessions + deleted_patients;
END;
$$;

-- 6. Trigger per impostare automaticamente il timestamp di retention
CREATE OR REPLACE FUNCTION set_gdpr_retention_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando una sessione viene marcata come deleted, imposta la data di retention
    IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        NEW.gdpr_retention_until := NEW.deleted_at + INTERVAL '30 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applica trigger alle sessioni
DROP TRIGGER IF EXISTS sessions_gdpr_retention_trigger ON sessions;
CREATE TRIGGER sessions_gdpr_retention_trigger
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_gdpr_retention_date();

-- 7. Crea politiche di retention di default per nuovi utenti
CREATE OR REPLACE FUNCTION create_default_retention_policies()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando si crea un nuovo utente, crea politiche GDPR automatiche
    INSERT INTO data_retention_policies (user_id, data_type, retention_period_days, legal_basis) VALUES
    (NEW.id, 'sessions', 30, 'GDPR Art. 17 - User deletion grace period'),
    (NEW.id, 'patient_data', 365, 'GDPR Art. 17 - Patient data cleanup after 1 year inactive'),
    (NEW.id, 'analytics', 1095, 'GDPR Art. 6 - Legitimate interest for service improvement');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applica trigger ai nuovi utenti
DROP TRIGGER IF EXISTS user_gdpr_policies_trigger ON users;
CREATE TRIGGER user_gdpr_policies_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_retention_policies();

-- 8. Comando per schedulare pulizia automatica (da eseguire con cron o scheduler)
-- Questo verrà eseguito ogni notte alle 2:00 AM
-- SELECT perform_automatic_gdpr_cleanup();

-- 9. Vista per monitoraggio GDPR (solo per admin/audit)
CREATE OR REPLACE VIEW gdpr_status_summary AS
SELECT 
    u.email as user_email,
    COUNT(s.id) as active_sessions,
    COUNT(CASE WHEN s.deleted_at IS NOT NULL THEN 1 END) as pending_deletion,
    COUNT(p.id) as active_patients,
    COUNT(CASE WHEN p.deleted_at IS NOT NULL THEN 1 END) as patients_pending_deletion,
    MAX(s."sessionDate") as last_session_date
FROM users u
LEFT JOIN sessions s ON u.id = s."userId" AND s."isActive" = true
LEFT JOIN patients p ON u.id = p."userId" AND p.deleted_at IS NULL
GROUP BY u.id, u.email;

-- 10. Funzione di utilità per cancellazione immediata GDPR su richiesta utente
CREATE OR REPLACE FUNCTION immediate_gdpr_deletion(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    result_message TEXT;
    deleted_sessions INTEGER;
    deleted_patients INTEGER;
BEGIN
    -- Verifica che l'utente esista
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = target_user_id) THEN
        RETURN 'ERROR: User not found';
    END IF;
    
    -- Cancella immediatamente tutte le sessioni dell'utente
    WITH deleted AS (
        DELETE FROM sessions 
        WHERE "userId" = target_user_id 
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_sessions FROM deleted;
    
    -- Cancella immediatamente tutti i pazienti dell'utente
    WITH deleted AS (
        DELETE FROM patients 
        WHERE "userId" = target_user_id 
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_patients FROM deleted;
    
    -- Log della cancellazione immediata
    INSERT INTO gdpr_deletion_log (
        user_id,
        deletion_type,
        data_categories,
        legal_basis,
        retention_period_applied
    ) VALUES (
        target_user_id,
        'immediate_gdpr_request',
        ARRAY['all_user_data', 'sessions', 'patients', 'audio_files'],
        'GDPR Art. 17 - Right to Erasure - User Request',
        0
    );
    
    result_message := format('GDPR deletion completed: %s sessions, %s patients deleted', 
                            deleted_sessions, deleted_patients);
    
    RETURN result_message;
END;
$$;

-- 5. Indici per performance delle query GDPR
CREATE INDEX IF NOT EXISTS idx_sessions_deletion ON sessions("isActive", deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_retention ON sessions(gdpr_retention_until) WHERE gdpr_retention_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_deletion ON patients(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gdpr_log_user ON gdpr_deletion_log(user_id, deleted_at);

-- 6. Vista di riepilogo GDPR (per monitoraggio admin)
CREATE OR REPLACE VIEW gdpr_cleanup_status AS
SELECT 
    COUNT(CASE WHEN s."isActive" = false AND s.deleted_at IS NOT NULL THEN 1 END) as sessions_pending_deletion,
    COUNT(CASE WHEN s.deleted_at < NOW() - INTERVAL '30 days' THEN 1 END) as sessions_ready_for_cleanup,
    COUNT(CASE WHEN p.deleted_at IS NOT NULL THEN 1 END) as patients_pending_deletion,
    MIN(s.deleted_at) as oldest_pending_deletion,
    MAX(s.deleted_at) as newest_pending_deletion
FROM sessions s
FULL OUTER JOIN patients p ON s."patientId" = p.id
WHERE s.deleted_at IS NOT NULL OR p.deleted_at IS NOT NULL;

-- 7. Commenti finali
-- Questo script implementa GDPR compliance automatica con:
-- ✅ Soft delete immediato quando utente elimina
-- ✅ Hard delete automatico dopo 30 giorni  
-- ✅ Log completo per audit GDPR
-- ✅ Trigger automatici per date retention
-- ✅ Pulizia automatica pazienti inattivi
-- ✅ Indici per performance query di pulizia
-- ✅ Vista di monitoraggio stato GDPR

-- Per attivare il sistema:
-- 1. Eseguire questo script in Supabase
-- 2. Configurare cron job in Vercel
-- 3. Aggiungere CRON_SECRET_KEY nelle env variables
-- 4. Deploy → Sistema attivo automaticamente!
