# CONFIGURAZIONE TRIGGERS IN SUPABASE

## 🎯 TRIGGER 1: Cleanup Rate Limits

### Impostazioni:
- **Name**: `cleanup_rate_limits_trigger`
- **Table**: `rate_limits`
- **Events**: `INSERT` (seleziona solo questo)
- **Orientation**: `Row`
- **Function**: `cleanup_rate_limits_on_insert()`
- **Enabled**: ✅ Sì

### Cosa fa:
Ogni volta che viene inserito un nuovo record in `rate_limits`, elimina automaticamente quelli vecchi di più di 1 ora.

---

## 🎯 TRIGGER 2: Cleanup Security Events

### Impostazioni:
- **Name**: `cleanup_security_events_trigger`
- **Table**: `security_events`
- **Events**: `INSERT` (seleziona solo questo)
- **Orientation**: `Row`
- **Function**: `cleanup_security_events_on_insert()`
- **Enabled**: ✅ Sì

### Cosa fa:
Ogni volta che viene inserito un nuovo record in `security_events`, elimina automaticamente quelli vecchi di più di 30 giorni (solo severità bassa/media).

---

## 🔧 SQL ALTERNATIVO (se preferisci)

Se preferisci creare i triggers via SQL invece che tramite interfaccia:

```sql
-- Trigger per rate_limits
CREATE TRIGGER cleanup_rate_limits_trigger
    AFTER INSERT ON "rate_limits"
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_rate_limits_on_insert();

-- Trigger per security_events
CREATE TRIGGER cleanup_security_events_trigger
    AFTER INSERT ON "security_events"
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_security_events_on_insert();
```

---

## 📊 VANTAGGI DEI TRIGGERS

### ✅ **Automatico**: Si attiva da solo quando serve
### ✅ **Efficiente**: Cleanup solo quando ci sono nuovi dati
### ✅ **Semplice**: No configurazione cron jobs
### ✅ **Affidabile**: Funziona sempre, anche se il server si riavvia

---

## 🧪 COME TESTARE

1. Inserisci un record di test:
```sql
INSERT INTO "rate_limits" (identifier, endpoint, requests_count)
VALUES ('test_ip', '/api/test', 1);
```

2. Verifica che il trigger abbia funzionato:
```sql
SELECT COUNT(*) FROM "rate_limits";
-- Dovrebbe aver eliminato i vecchi record
```
