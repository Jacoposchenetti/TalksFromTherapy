# 🔐 GUIDA SICUREZZA CRITTOGRAFIA - TalksFromTherapy

## GESTIONE ENCRYPTION_MASTER_KEY

### 🎯 PANORAMICA
La `ENCRYPTION_MASTER_KEY` è la chiave principale che protegge tutti i dati sensibili:
- Transcript delle sessioni
- Note dei pazienti
- Risultati delle analisi emotive
- Ricerche personalizzate

### ⚙️ CONFIGURAZIONE

#### Sviluppo
```bash
# .env.local
ENCRYPTION_MASTER_KEY=ChiaveDiSviluppo123456789ABCDEF
```

#### Produzione
```bash
# Variabile d'ambiente del server
ENCRYPTION_MASTER_KEY=ChiaveProduzioneSuperSegreta2025!@#$
```

### 🔄 ROTAZIONE CHIAVE

**Quando rotare:**
- Ogni 6-12 mesi (best practice)
- Se sospetti compromissione
- Prima di andare in produzione

**Come rotare:**
1. Genera nuova chiave sicura (52+ caratteri)
2. Imposta `OLD_ENCRYPTION_MASTER_KEY` e `NEW_ENCRYPTION_MASTER_KEY`
3. Esegui: `node scripts/rotate-encryption-key.js`
4. Aggiorna la variabile di produzione
5. Rimuovi le vecchie variabili

### 🚨 RECUPERO EMERGENZA

#### Se perdi la chiave:
1. **STOP IMMEDIATO** dell'applicazione
2. Ripristina da backup sicuro della chiave
3. Se impossibile: reset completo del database
4. Implementa processo di backup chiavi

#### Checklist sicurezza:
- [ ] Chiave salvata in password manager
- [ ] Backup sicuro della chiave
- [ ] Variabili d'ambiente protette
- [ ] Accesso limitato al team
- [ ] Log di rotazione chiavi

### 🛡️ COMPLIANCE GDPR

✅ **Cosa è garantito:**
- Crittografia AES-256-CBC
- Salt unico per ogni dato
- Derivazione chiave PBKDF2 (100k iterazioni)
- Dati illeggibili senza chiave

✅ **Diritti GDPR supportati:**
- Diritto all'oblio (soft delete + crittografia)
- Portabilità dati (export decriptato)
- Accesso ai dati (visualizzazione sicura)

### 📞 CONTATTI EMERGENZA

**Team di sviluppo:** [email sviluppatori]
**Security Officer:** [email security]
**Backup team:** [email backup]

---

⚠️ **IMPORTANTE:** Non condividere mai questa documentazione con la chiave reale!
