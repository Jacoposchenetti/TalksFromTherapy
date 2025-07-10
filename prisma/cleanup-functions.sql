-- Funzioni di Cleanup per Database Triggers
-- Esegui questo nel SQL Editor di Supabase PRIMA di creare i triggers

-- Funzione per cleanup automatico rate limits
CREATE OR REPLACE FUNCTION cleanup_rate_limits_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Ogni volta che viene inserito un nuovo rate limit,
  -- elimina quelli vecchi di più di 1 ora
  DELETE FROM "rate_limits" 
  WHERE "window_start" < NOW() - INTERVAL '1 hour';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funzione per cleanup automatico security events
CREATE OR REPLACE FUNCTION cleanup_security_events_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Ogni volta che viene inserito un nuovo security event,
  -- elimina quelli vecchi di più di 30 giorni (solo severità bassa/media)
  DELETE FROM "security_events" 
  WHERE "created_at" < NOW() - INTERVAL '30 days'
  AND "severity" NOT IN ('high', 'critical');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funzione per cleanup periodico manuale (opzionale)
CREATE OR REPLACE FUNCTION manual_cleanup_all()
RETURNS void AS $$
BEGIN
  -- Cleanup rate limits
  DELETE FROM "rate_limits" 
  WHERE "window_start" < NOW() - INTERVAL '1 hour';
  
  -- Cleanup security events
  DELETE FROM "security_events" 
  WHERE "created_at" < NOW() - INTERVAL '30 days'
  AND "severity" NOT IN ('high', 'critical');
  
  -- Log cleanup execution
  INSERT INTO "security_events" (
    "event_type", 
    "identifier", 
    "details", 
    "severity"
  ) VALUES (
    'system_cleanup',
    'system',
    '{"action": "manual_cleanup_executed"}',
    'low'
  );
END;
$$ LANGUAGE plpgsql;
