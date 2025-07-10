# ✅ CHECKLIST SICUREZZA PRE-PRODUZIONE

## 🔐 CRITTOGRAFIA
- [ ] Genera nuova `ENCRYPTION_MASTER_KEY` per produzione (52+ caratteri)
- [ ] Salva la chiave in password manager aziendale
- [ ] Configura variabile d'ambiente sul server di produzione
- [ ] Testa la crittografia con dati di test
- [ ] Rimuovi la chiave di sviluppo da tutti i file

## 🛡️ CONFIGURAZIONE SERVER
- [ ] Imposta `NODE_ENV=production`
- [ ] Configura HTTPS obbligatorio
- [ ] Abilita rate limiting
- [ ] Configura backup automatici database
- [ ] Imposta log di sicurezza

## 🚨 VARIABILI AMBIENTE PRODUZIONE
```bash
# OBBLIGATORIE
ENCRYPTION_MASTER_KEY=TuaChiaveSegretaProduzione
NEXT_PUBLIC_SUPABASE_URL=https://tuo-progetto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tuo_anon_key
SUPABASE_SERVICE_ROLE_KEY=tuo_service_key

# OPZIONALI
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...
```

## 📋 PIANO DI DISASTER RECOVERY
- [ ] Backup della chiave di crittografia
- [ ] Procedure di rotazione chiave documentate
- [ ] Contatti del team di sicurezza
- [ ] Script di ripristino testati

## 🎯 TEST FINALI
- [ ] Test di crittografia/decrittografia
- [ ] Test API con autenticazione
- [ ] Test rate limiting
- [ ] Test di accesso unauthorized
- [ ] Test backup/restore

---

**Data completamento:** ___________
**Responsabile:** _______________
**Approvazione Security:** _______________
