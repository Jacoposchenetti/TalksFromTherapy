# 🗺️ ROADMAP ENCRYPTION KEYS - TalksFromTherapy

## 📍 STATO ATTUALE (10/07/2025)

### 🟢 DEVELOPMENT (In uso)
```bash
Ambiente: Sviluppo locale
Chiave: vedi nel env.local o su bitwarden
Stato: ✅ ATTIVA e sicura per development
Salvata in: ✅ Bitwarden "TalksFromTherapy - Development"
Condivisa con: Team (2 persone)
Scadenza: Nessuna (per development)
Backup: ✅ Sicuro in Bitwarden Vault
```

## 📅 PROSSIMI STEP

### 🟡 STAGING (Quando necessario)
```bash
Quando: Prima di demo pubbliche o test con dati sensibili
Azione: Generare nuova chiave specifica per staging
Comando: node scripts/generate-key.js --env=staging
Salvare in: Bitwarden "TalksFromTherapy - Staging Key"
```

### 🔴 PRODUCTION (Prima del deploy)
```bash
Quando: Prima del lancio pubblico
Azione: 
  1. Generare chiave production super-sicura
  2. Configurare su server di produzione
  3. Testare con script di rotazione
  4. Backup sicuro in Bitwarden
  
Lunghezza: 64+ caratteri
Caratteri: A-Z, a-z, 0-9, simboli speciali
Esempio: Prod2025!TalksTherapy#LiveData$SecureKey789@Production123
Salvare in: Bitwarden "TalksFromTherapy - Production Key"
```

## 🔄 PIANO DI ROTAZIONE

### Development:
- ⏰ Rotazione: Solo se compromessa
- 📋 Procedura: Semplice sostituzione

### Production:
- ⏰ Rotazione: Ogni 6 mesi obbligatoria
- 📋 Procedura: Script `rotate-encryption-key.js`
- 📅 Prossima: 6 mesi dopo go-live

## 🎯 CHECKLIST DEVELOPMENT (COMPLETATO)

- [x] Chiave development sicura (64 caratteri)
- [x] Chiave salvata in Bitwarden
- [x] Collezione "TalksFromTherapy - Development" creata
- [x] Crittografia implementata e testata
- [x] API security audit completato
- [x] GDPR compliance implementato

## 🎯 CHECKLIST PRE-PRODUZIONE (FUTURO)

- [ ] Chiave production generata (64+ caratteri)
- [ ] Chiave salvata in Bitwarden separata
- [ ] Configurata su server produzione
- [ ] Script di rotazione testato
- [ ] Backup plan documentato
- [ ] Team training completato

## 🚨 EMERGENCY CONTACTS

- Bitwarden Recovery: [email team]
- Hosting Provider: [contatto hosting]
- Database Admin: [contatto DB]

---

🎯 **TL;DR:** 
La chiave attuale è perfetta per sviluppo.
Genera una nuova per produzione quando fai il deploy live.
