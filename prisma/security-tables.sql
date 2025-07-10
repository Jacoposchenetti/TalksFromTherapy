-- Tabella per Rate Limiting e Security Monitoring
-- Aggiungere al database per supportare il middleware di sicurezza

-- Tabella per tracking rate limiting
CREATE TABLE "rate_limits" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" TEXT NOT NULL, -- IP address o user ID
  "endpoint" TEXT NOT NULL, -- API endpoint
  "requests_count" INTEGER DEFAULT 1,
  "window_start" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "blocked_until" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX "rate_limits_identifier_idx" ON "rate_limits"("identifier");
CREATE INDEX "rate_limits_endpoint_idx" ON "rate_limits"("endpoint");
CREATE INDEX "rate_limits_window_start_idx" ON "rate_limits"("window_start");
CREATE INDEX "rate_limits_blocked_until_idx" ON "rate_limits"("blocked_until");

-- Tabella per security events
CREATE TABLE "security_events" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_type" TEXT NOT NULL, -- 'failed_auth', 'rate_limit_exceeded', 'suspicious_activity'
  "identifier" TEXT NOT NULL, -- IP o user ID
  "user_id" TEXT,
  "endpoint" TEXT,
  "details" TEXT, -- JSON con dettagli aggiuntivi
  "ip_address" TEXT,
  "user_agent" TEXT,
  "severity" TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  "resolved" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX "security_events_event_type_idx" ON "security_events"("event_type");
CREATE INDEX "security_events_identifier_idx" ON "security_events"("identifier");
CREATE INDEX "security_events_user_id_idx" ON "security_events"("user_id");
CREATE INDEX "security_events_created_at_idx" ON "security_events"("created_at");
CREATE INDEX "security_events_severity_idx" ON "security_events"("severity");

-- Funzione per cleanup automatico dei vecchi record
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM "rate_limits" 
  WHERE "window_start" < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Funzione per cleanup automatico dei vecchi security events
CREATE OR REPLACE FUNCTION cleanup_old_security_events()
RETURNS void AS $$
BEGIN
  DELETE FROM "security_events" 
  WHERE "created_at" < NOW() - INTERVAL '30 days'
  AND "severity" NOT IN ('high', 'critical');
END;
$$ LANGUAGE plpgsql;
