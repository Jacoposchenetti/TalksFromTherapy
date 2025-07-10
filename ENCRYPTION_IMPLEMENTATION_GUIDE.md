# GUIDA IMPLEMENTAZIONE CRITTOGRAFIA DATI SENSIBILI

## 🔐 CONFIGURAZIONE CHIAVE MASTER

### 1. Aggiungi al file .env.local:
```bash
# Chiave master per crittografia (GENERA UNA NUOVA!)
ENCRYPTION_MASTER_KEY=your-super-secure-32-char-key-here-change-this-now-please
```

### 2. Genera una chiave sicura:
```bash
# Genera una chiave casuale di 64 caratteri
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🛡️ IMPLEMENTAZIONE GRADUALE

### FASE 1: Setup (FATTO ✅)
- [x] Creato `src/lib/encryption.ts`
- [x] Sistema AES-256-GCM con salt e IV casuali
- [x] Derivazione chiave PBKDF2 con 100k iterazioni

### FASE 2: Cripta Nuovi Dati
```typescript
// Esempio: Criptare trascrizioni in ingresso
import { encryptSensitiveData } from '@/lib/encryption'

// Nel salvare trascrizione
const encryptedTranscript = encryptSensitiveData(transcript)
await supabase.from('sessions').update({ 
  transcript: encryptedTranscript 
})
```

### FASE 3: Decripta in Lettura
```typescript
// Esempio: Decriptare trascrizioni in uscita  
import { decryptSensitiveData } from '@/lib/encryption'

// Nel leggere trascrizione
const { data } = await supabase.from('sessions').select('transcript')
const decryptedTranscript = decryptSensitiveData(data.transcript)
```

## 📊 DATI DA CRIPTARE (PRIORITÀ)

### 🔥 ALTA PRIORITÀ
1. **Trascrizioni sessioni** (`sessions.transcript`)
2. **Note sessioni** (`session_notes.content`)
3. **Analisi emotive** (`analyses.emotions`, `analyses.significantEmotions`)

### 📈 MEDIA PRIORITÀ  
4. **Iniziali pazienti** (`patients.initials`)
5. **Note pazienti** (`patients.notes`)
6. **Risultati analisi** (`analyses.topicAnalysisResult`)

### 🔧 BASSA PRIORITÀ
7. **Dettagli sicurezza** (`security_events.details`)
8. **Metadata documenti** (`sessions.documentMetadata`)

## 🚀 ESEMPIO IMPLEMENTAZIONE

### File: `src/app/api/sessions/[id]/transcript/route.ts`
```typescript
import { encryptSensitiveData, decryptSensitiveData } from '@/lib/encryption'

// POST: Salvare trascrizione criptata
const encryptedTranscript = encryptSensitiveData(transcript)
await supabase.from('sessions').update({ 
  transcript: encryptedTranscript 
})

// GET: Leggere trascrizione decriptata
const { data } = await supabase.from('sessions').select('transcript')
const decryptedTranscript = decryptSensitiveData(data.transcript)
```

## 🧪 TEST CRITTOGRAFIA

### Comando test:
```typescript
import { testEncryption } from '@/lib/encryption'

// Nel terminale o in un endpoint di test
console.log('Test crittografia:', testEncryption())
```

## ⚡ MIGRAZIONE DATI ESISTENTI

### Script di migrazione (opzionale):
```sql
-- Backup prima della migrazione
CREATE TABLE sessions_backup AS SELECT * FROM sessions;

-- Poi usa script Node.js per criptare dati esistenti
```

## 🎯 BENEFICI

### ✅ SICUREZZA
- **AES-256-GCM**: Crittografia militare
- **Salt casuali**: Ogni record unico  
- **PBKDF2**: Derivazione chiave sicura
- **Authenticated encryption**: Prevenzione tampering

### ✅ COMPLIANCE
- **GDPR Ready**: Dati "pseudonimizzati"
- **HIPAA Compatible**: Standard medicali
- **SOC2 Ready**: Controlli enterprise

### ✅ PERFORMANCE
- **Crittografia veloce**: AES hardware-accelerated
- **Lazy decryption**: Solo quando serve
- **Backward compatible**: Dati esistenti funzionano

## 🚨 IMPORTANTE

1. **BACKUP CHIAVE MASTER**: Senza chiave, dati irrecuperabili!
2. **TEST COMPLETO**: Prima di andare in produzione
3. **GRADUALE**: Implementa una cosa alla volta
4. **MONITORING**: Log errori crittografia

## 🔄 ROLLBACK PLAN

Se qualcosa va storto:
1. Disabilita crittografia nelle API
2. Usa backup database  
3. Migra gradualmente

---

**Il sistema è OPZIONALE ma ALTAMENTE RACCOMANDATO per dati medici!** 🏥🔐
