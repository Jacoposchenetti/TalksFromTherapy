# Git Workflow & Development Guidelines
**Branch di lavoro: `origin/andre`**

## 🔧 Configurazione Git Base

### Setup iniziale
```bash
git branch -M andre
git push -u origin andre
git config --local user.name "Andre"
git config --local user.email "andre@example.com"
```

### Status del repository
- **Branch principale**: `origin/andre`
- **Database**: SQLite locale (non committato)
- **Configurazione**: `.env` locale (non committato)

## 📁 File da NON committare
- `.env` (configurazione locale)
- `*.db` `*.sqlite` (database locale)
- `node_modules/`
- `.next/`
- `dist/` `build/`
- Logs e cache temporanei

## 🔄 Workflow di Sviluppo

### Prima di iniziare una nuova feature
1. **Verifica stato pulito**:
   ```bash
   git status
   git stash  # se ci sono modifiche non committate
   ```

2. **Aggiorna branch**:
   ```bash
   git pull origin andre
   ```

3. **Crea commit di checkpoint** (se necessario):
   ```bash
   git add .
   git commit -m "checkpoint: stato funzionante pre-feature"
   ```

### Durante lo sviluppo
- **Commit frequenti** per ogni micro-funzionalità completata
- **Messaggi chiari**: `feat: aggiungi export PDF`, `fix: correggi import path`, `refactor: migliora gestione errori`
- **Test immediato** dopo ogni modifica significativa

### Gestione degli errori
- **SEMPRE controllare build**: `npm run build` prima di committare
- **Se build fallisce**: fermarsi, analizzare l'errore, NON inventare correzioni
- **Rollback veloce**: `git restore .` per tornare all'ultimo commit funzionante

## 🎯 Guidelines per Copilot

### Focus e Scope
- **Una feature alla volta**: non mescolare implementazioni diverse
- **Analisi prima di azione**: sempre leggere il codice esistente prima di modificare
- **Errori reali**: analizzare messaggi di errore completi, non assumere cause

### Pattern di lavoro
1. **Comprensione**: leggere e capire il codice esistente
2. **Pianificazione**: spiegare cosa si farà PRIMA di farlo
3. **Implementazione**: modifiche incrementali e testate
4. **Verifica**: build e test funzionale immediato

### File core del progetto
- **Database**: `prisma/schema.prisma`
- **Auth**: `src/lib/auth.ts`, `src/app/api/auth/`
- **API Routes**: `src/app/api/`
- **Components**: `src/components/`
- **Utils**: `src/lib/`

## 🚨 Red Flags - STOP immediato
- Build che fallisce con errori TypeScript
- Import path errati
- File vuoti in directory critiche
- Conflitti Git non risolti
- Modifiche a file di configurazione senza motivo

## 📝 Commit Message Format
```
<type>: <descrizione breve>

<dettagli opzionali>

Examples:
feat: aggiungi export PDF per trascrizioni
fix: correggi path import in test-db.ts
refactor: semplifica logica di autenticazione
docs: aggiorna README con setup database
```

## 🔍 Debugging Process
1. **Leggere l'errore completo** (non solo la prima riga)
2. **Identificare il file e riga specifici**
3. **Controllare il contesto** (file che importano, dipendenze)
4. **Fix minimale**: cambiare solo ciò che è necessario
5. **Test immediato**: verificare che il fix funzioni

## 🎯 Obiettivi Correnti
- ✅ Setup base progetto e database
- ✅ Sistema di autenticazione
- ✅ Gestione pazienti e sessioni
- 🚧 **PROSSIMO**: Implementazione export trascrizioni (PDF/TXT)
- 📋 **FUTURO**: Analisi AI delle sessioni
- 📋 **FUTURO**: Dashboard analytics

## 📊 Stato del Progetto
- **Database**: ✅ Configurato e funzionante
- **Auth**: ✅ NextAuth implementato
- **API**: ✅ Endpoint base implementati
- **Frontend**: ✅ Pagine principali create
- **Build**: ⚠️ Warnings Next.js (non bloccanti)
- **Server dev**: ✅ Funzionante su localhost:3000

---
**Ricorda**: Sempre verificare che il server funzioni dopo ogni modifica significativa!
