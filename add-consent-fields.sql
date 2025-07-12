-- Aggiungi campi per consenso GDPR alla tabella users
-- Da eseguire in Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  consent_terms_accepted BOOLEAN DEFAULT FALSE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  consent_privacy_accepted BOOLEAN DEFAULT FALSE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  consent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  consent_ip_address INET;

-- Aggiorna utenti esistenti per impostare consenso come accettato
-- (necessario per retrocompatibilità)
UPDATE users 
SET 
  consent_terms_accepted = TRUE,
  consent_privacy_accepted = TRUE,
  consent_date = "createdAt"
WHERE 
  consent_terms_accepted IS NULL 
  OR consent_privacy_accepted IS NULL;

-- Crea indice per performance su query consenso
CREATE INDEX IF NOT EXISTS idx_users_consent 
ON users(consent_terms_accepted, consent_privacy_accepted);

-- Commenti per documentazione
COMMENT ON COLUMN users.consent_terms_accepted IS 'Consenso Terms of Service (GDPR compliance)';
COMMENT ON COLUMN users.consent_privacy_accepted IS 'Consenso Privacy Policy (GDPR compliance)';
COMMENT ON COLUMN users.consent_date IS 'Data/ora quando è stato dato il consenso';
COMMENT ON COLUMN users.consent_ip_address IS 'IP address da cui è stato dato il consenso';
