-- 🗓️ GOOGLE CALENDAR INTEGRATION TABLE
-- Tabella per gestire l'integrazione con Google Calendar

-- Crea la tabella per le integrazioni Google Calendar
CREATE TABLE IF NOT EXISTS google_calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  calendar_id TEXT DEFAULT 'primary',
  calendar_name TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_google_calendar_user_id ON google_calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_google_user_id ON google_calendar_integrations(google_user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_enabled ON google_calendar_integrations(sync_enabled);

-- Abilita Row Level Security (RLS)
ALTER TABLE google_calendar_integrations ENABLE ROW LEVEL SECURITY;

-- Policy di sicurezza: gli utenti possono vedere solo le proprie integrazioni
CREATE POLICY "Users can only see their own calendar integrations" 
ON google_calendar_integrations FOR ALL 
USING (auth.uid() = user_id);

-- Policy per permettere agli utenti di inserire le proprie integrazioni
CREATE POLICY "Users can insert their own calendar integrations" 
ON google_calendar_integrations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy per permettere agli utenti di aggiornare le proprie integrazioni
CREATE POLICY "Users can update their own calendar integrations" 
ON google_calendar_integrations FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy per permettere agli utenti di eliminare le proprie integrazioni
CREATE POLICY "Users can delete their own calendar integrations" 
ON google_calendar_integrations FOR DELETE 
USING (auth.uid() = user_id);

-- Funzione per aggiornare automaticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare updated_at automaticamente
CREATE TRIGGER update_google_calendar_integrations_updated_at
  BEFORE UPDATE ON google_calendar_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commenti per documentazione
COMMENT ON TABLE google_calendar_integrations IS 'Gestisce le integrazioni degli utenti con Google Calendar';
COMMENT ON COLUMN google_calendar_integrations.user_id IS 'ID utente Supabase che possiede l''integrazione';
COMMENT ON COLUMN google_calendar_integrations.google_user_id IS 'ID utente Google univoco';
COMMENT ON COLUMN google_calendar_integrations.access_token IS 'Token di accesso Google (crittografato in production)';
COMMENT ON COLUMN google_calendar_integrations.refresh_token IS 'Token di refresh Google (crittografato in production)';
COMMENT ON COLUMN google_calendar_integrations.token_expires_at IS 'Data di scadenza del token di accesso';
COMMENT ON COLUMN google_calendar_integrations.calendar_id IS 'ID del calendario Google (default: primary)';
COMMENT ON COLUMN google_calendar_integrations.calendar_name IS 'Nome/email del calendario per display';
COMMENT ON COLUMN google_calendar_integrations.sync_enabled IS 'Se la sincronizzazione è attiva';

-- Esempio di query per verificare la creazione
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'google_calendar_integrations'
-- ORDER BY ordinal_position;
