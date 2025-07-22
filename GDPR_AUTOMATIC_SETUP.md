# GDPR Automatico - Configurazione per Deploy

## 🔧 Variabili d'Ambiente da Aggiungere

```env
# Per sicurezza del cron job
CRON_SECRET_KEY=your-secret-key-here-make-it-strong

# Per configurazioni GDPR (opzionali)
GDPR_GRACE_PERIOD_DAYS=30
GDPR_PATIENT_RETENTION_DAYS=365
GDPR_ANALYTICS_RETENTION_DAYS=1095
```

## ⏰ Vercel Cron Job Configuration

Crea file: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/gdpr-cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Questo eseguirà la pulizia GDPR ogni notte alle 2:00 AM UTC.

## 🎯 Logica GDPR Implementata

### Automatismo Completo:
- ✅ **User deletes session** → Soft delete immediato
- ✅ **Dopo 30 giorni** → Hard delete automatico notturno  
- ✅ **Pazienti inattivi > 1 anno** → Cancellazione automatica
- ✅ **Log completo** → Audit trail per compliance
- ✅ **Zero intervento utente** → Tutto trasparente

### Compliance GDPR:
- ✅ **Art. 17** - Right to Erasure (30 giorni grace period)
- ✅ **Art. 25** - Data Protection by Design
- ✅ **Art. 30** - Records of Processing (gdpr_deletion_log)
- ✅ **Art. 32** - Security (encrypted deletion)

### Retention Policy Standard:
- **Sessioni eliminate**: 30 giorni poi hard delete
- **Pazienti inattivi**: 1 anno poi marcatura per cancellazione  
- **Dati sanitari**: 7 anni per compliance medica
- **Log audit**: Conservazione permanente per compliance

## 🚀 Deploy Steps

1. **Esegui il database schema**:
   ```sql
   -- Esegui gdpr-database-schema.sql in Supabase
   ```

2. **Aggiungi variabili d'ambiente** in Vercel

3. **Deploy automatico** → Cron job si attiva

4. **Monitor** nei log di Vercel ogni notte

## ✅ Il sistema è completamente automatico!

L'utente (terapista) non vede nulla di tutto questo.
Clicca "elimina" → sparisce → dopo 30 giorni si cancella per sempre.
GDPR compliance totale senza seccature! 🎯
