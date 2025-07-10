# 🆓 SETUP BITWARDEN GRATUITO - TEAM 2 PERSONE

## 🚀 CONFIGURAZIONE RAPIDA (5 minuti)

### STEP 1: Creazione Account
```bash
1. Vai su https://bitwarden.com
2. Clicca "Get Started" 
3. Scegli "Business" (anche se è gratis per 2 persone)
4. Crea account principale (Team Lead)
```

### STEP 2: Creazione Organizzazione
```bash
1. Dopo login, vai su "Organizations"
2. Clicca "New Organization"
3. Nome: "TalksFromTherapy"
4. Piano: "Free" (2 utenti, vault illimitati)
5. Conferma creazione
```

### STEP 3: Invita il secondo membro
```bash
1. Vai su "Members" nell'organizzazione
2. Clicca "Invite User"
3. Email del collega
4. Tipo: "Admin" (per entrambi pieni poteri)
5. Il collega riceve invito via email
```

### STEP 4: Crea Collections per il progetto
```bash
📁 TalksFromTherapy-Production
   - ENCRYPTION_MASTER_KEY
   - Supabase Prod Keys
   - Domini e certificati

📁 TalksFromTherapy-Development  
   - ENCRYPTION_MASTER_KEY_DEV
   - API keys di test
   - Database di sviluppo

📁 Emergency-Contacts
   - Hosting provider
   - Domain registrar
   - Team contacts
```

## 🔐 SALVATAGGIO CHIAVI

### Template per Secure Note:
```
🏷️ Nome: TalksFromTherapy - Production Encryption Key
🔒 Collection: TalksFromTherapy-Production

📝 Contenuto:
==========================================
ENCRYPTION_MASTER_KEY (Production)
==========================================

Chiave: A7B9C3D5E8F2G6H1I4J7K0L3M9N2O5P8Q1R4S7T0U3V6W9X2Y5Z8

📋 Info:
- Progetto: TalksFromTherapy
- Ambiente: PRODUZIONE
- Creata: 10/07/2025
- Team: [Nome 1], [Nome 2]
- Prossima rotazione: 10/01/2026 (6 mesi)

⚠️ ATTENZIONE:
- Rotazione ogni 6 mesi obbligatoria
- Non condividere fuori dal team
- Backup automatico attivo in Bitwarden

🔄 Cronologia rotazioni:
- 10/07/2025: Creazione iniziale
- __/__/2026: Prossima rotazione

🚨 Emergency procedure:
1. Script: scripts/rotate-encryption-key.js
2. Backup team contact: [email]
==========================================
```

## 📱 INSTALLAZIONE APP

### Entrambi i membri del team:
```bash
🖥️ Desktop App: https://bitwarden.com/download/
🌐 Browser Extension: Chrome/Firefox/Safari
📱 Mobile App: iOS/Android
💻 CLI (opzionale): npm install -g @bitwarden/cli
```

## 🔧 AUTOMAZIONE (Opzionale)

### Bitwarden CLI per scripts:
```bash
# Login
bw login

# Get secret per deployment
bw get item "TalksFromTherapy Production Key"

# Uso in CI/CD
export ENCRYPTION_MASTER_KEY=$(bw get password "Encryption Key")
```

## 📊 CONFRONTO PIANO GRATUITO vs PAID

| Funzione | Gratuito (2 users) | Business ($3/user) |
|----------|-------------------|-------------------|
| Utenti | 2 | Illimitati |
| Collections | Illimitate | Illimitate |
| 2FA | ✅ | ✅ |
| API Access | ✅ | ✅ |
| Admin Console | ✅ | ✅ |
| Directory Sync | ❌ | ✅ |
| Advanced 2FA | ❌ | ✅ |
| Priority Support | ❌ | ✅ |

## 🎯 CONCLUSIONE
Il piano gratuito Bitwarden è PERFETTO per voi due!
Avete tutto quello che serve per gestire le chiavi di TalksFromTherapy in sicurezza.
