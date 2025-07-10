# 🔐 SETUP BITWARDEN PER TALKSFROMTHERAPY

## INSTALLAZIONE
1. Vai su https://bitwarden.com
2. Crea account aziendale/personale
3. Installa app desktop + browser extension
4. Abilita 2FA (TOTP o hardware key)

## ORGANIZZAZIONE VAULT

### 📁 Struttura consigliata:
```
🗂️ TalksFromTherapy/
├── 🔑 Production Keys/
│   ├── ENCRYPTION_MASTER_KEY (Secure Note)
│   ├── Supabase Service Key (Login)
│   └── OpenAI API Key (Login)
├── 🛠️ Development Keys/
│   ├── ENCRYPTION_MASTER_KEY_DEV (Secure Note)
│   └── Test API Keys (Login)
├── 🌐 Database Access/
│   ├── Supabase Dashboard (Login)
│   └── Database Backups (Secure Note)
└── 📞 Emergency Contacts/
    ├── Team Lead (Secure Note)
    └── Hosting Provider (Login)
```

## 💾 TEMPLATE SECURE NOTE

### Nome: "TalksFromTherapy - Encryption Master Key"
```
🏷️ Tipo: Production Key
📅 Creata: 2025-01-XX
🔄 Ultima rotazione: 2025-01-XX
📍 Usata in: Produzione TalksFromTherapy

🔑 CHIAVE:
ENCRYPTION_MASTER_KEY=A7B9C3D5E8F2G6H1I4J7K0L3M9N2O5P8Q1R4S7T0U3V6W9X2Y5Z8

⚠️ IMPORTANTE:
- Non condividere mai questa chiave
- Rotazione ogni 6 mesi
- Backup automatico attivo
- Accesso limitato a: [Lista nomi team]

📋 CRONOLOGIA ROTAZIONI:
- 2025-01-XX: Creazione iniziale
- 2025-XX-XX: Prossima rotazione programmata

🚨 IN CASO DI EMERGENZA:
1. Contattare: [Nome team lead]
2. Script rotazione: scripts/rotate-encryption-key.js
3. Backup location: [Cloud storage sicuro]
```

## 🔗 CONDIVISIONE SICURA (Team)

### Setup Organization:
1. Crea "Organization" in Bitwarden
2. Invita membri del team
3. Crea "Collection" per progetto
4. Assegna permessi granulari:
   - Admin: Accesso completo
   - Developer: Solo lettura production keys
   - Tester: Solo development keys

### Audit e Monitoring:
- ✅ Log accessi alle chiavi
- ✅ Notifiche modifiche
- ✅ Review trimestrale accessi
- ✅ Rotazione programmata
