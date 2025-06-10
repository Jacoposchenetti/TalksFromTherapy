# TalksFromTherapy - Pianificazione del Progetto

## Panoramica del Progetto

TalksFromTherapy è una web application dedicata ai psicoterapisti che offre:
- **Step 1**: Caricamento e trascrizione automatica di file audio di dialoghi terapeutici
- **Step 2**: Organizzazione delle trascrizioni in cartelle per singolo paziente
- **Step 3**: Analisi NLP delle trascrizioni e dashboard per visualizzare lo storico evolutivo per paziente

## Architettura Generale

### Frontend
- **Framework**: Next.js 14+ con App Router
- **Styling**: Tailwind CSS + shadcn/ui per componenti UI professionali
- **State Management**: Zustand per gestione stato globale
- **Upload Files**: React Dropzone per caricamento file audio
- **Charts**: Recharts per dashboard e visualizzazioni
- **Audio Player**: React Audio Player per playback audio

### Backend & Database
- **Runtime**: Node.js con TypeScript
- **Framework**: Next.js API Routes (full-stack)
- **Database**: PostgreSQL con Prisma ORM
- **File Storage**: AWS S3 o Supabase Storage per file audio
- **Authentication**: NextAuth.js con JWT

### Servizi Esterni
- **Trascrizione Audio**: 
  - Primaria: OpenAI Whisper API
  - Alternativa: AssemblyAI o Azure Speech Services
- **Analisi NLP**: 
  - OpenAI GPT-4 API per analisi semantica
  - Sentiment analysis e topic extraction
- **Email**: Resend o SendGrid per notifiche

### Sicurezza e Privacy
- **Autenticazione**: Email/password con hashing bcrypt
- **Autorizzazione**: JWT tokens con refresh mechanism
- **Crittografia**: Dati sensibili crittografati at-rest e in-transit
- **GDPR Compliance**: Gestione consenso e diritto alla cancellazione
- **Rate Limiting**: Protezione API endpoints
- **Audit Logging**: Log delle operazioni sensibili

## Schema Database (PostgreSQL + Prisma)

```prisma
// Schema principale
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  password        String    // hashed with bcrypt
  name            String
  licenseNumber   String?   // numero ordine professionale
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  patients        Patient[]
  sessions        Session[]
}

model Patient {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id])
  initials     String    // solo iniziali per privacy
  dateOfBirth  DateTime?
  notes        String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  sessions     Session[]
  analyses     Analysis[]
}

model Session {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  patientId     String
  patient       Patient   @relation(fields: [patientId], references: [id])
  title         String
  audioUrl      String?   // URL del file audio
  audioFileName String?
  transcript    String?
  sessionDate   DateTime
  duration      Int?      // durata in secondi
  status        SessionStatus @default(UPLOADED)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  analyses      Analysis[]
}

model Analysis {
  id               String    @id @default(cuid())
  sessionId        String
  session          Session   @relation(fields: [sessionId], references: [id])
  patientId        String
  patient          Patient   @relation(fields: [patientId], references: [id])
  sentimentScore   Float?    // -1 to 1
  emotions         Json?     // array di emozioni rilevate
  keyTopics        Json?     // array di topic principali
  therapeuticGoals Json?     // obiettivi terapeutici identificati
  progressNotes    String?   // note automatiche su progressi
  summary          String?   // riassunto della sessione
  createdAt        DateTime  @default(now())
}

enum SessionStatus {
  UPLOADED
  TRANSCRIBING
  TRANSCRIBED
  ANALYZING
  ANALYZED
  ERROR
}
```

## Struttura Directory del Progetto

```
talks-from-therapy/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/
│   │   ├── patients/
│   │   │   └── [id]/
│   │   ├── sessions/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── patients/
│   │   │   ├── sessions/
│   │   │   ├── transcribe/
│   │   │   └── analyze/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── patients/
│   │   └── sessions/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── transcription.ts
│   │   ├── nlp-analysis.ts
│   │   └── utils.ts
│   └── types/
├── .env.local
├── package.json
└── README.md
```

## Variabili Ambiente Richieste

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY="sk-..."

# File Storage
NEXT_PUBLIC_SUPABASE_URL="..."
SUPABASE_SERVICE_KEY="..."

# Email (opzionale)
RESEND_API_KEY="..."
```

## Flusso di Lavoro Principale

### Step 1: Upload e Trascrizione
1. Utente carica file audio (.mp3, .wav, .m4a)
2. File salvato su storage cloud
3. Invio a servizio trascrizione (Whisper API)
4. Salvataggio trascrizione in database

### Step 2: Organizzazione
1. Associazione trascrizione a paziente
2. Creazione cartelle virtuali per paziente
3. Tagging e categorizzazione sessioni

### Step 3: Analisi e Dashboard
1. Analisi NLP automatica su trascrizione
2. Estrazione sentiment, emozioni, topic
3. Generazione insights e progressi
4. Visualizzazione dashboard con grafici temporali

## Istruzioni per l'Agente AI

### Completamento Tasks
- Spunta le caselle nei file TASKS.md usando la sintassi `- [x] Task completato`
- Mantieni sempre il formato markdown corretto
- Aggiungi note di completamento con timestamp quando utile
- Se un task presenta problemi, aggiungi note esplicative

### Priorità di Sviluppo
1. **Fase 1**: Setup base + autenticazione + database
2. **Fase 2**: Upload audio + trascrizione + gestione pazienti
3. **Fase 3**: Dashboard + analisi NLP + visualizzazioni
4. **Fase 4**: Ottimizzazioni + sicurezza + deploy

### Considerazioni Tecniche Importanti
- **Privacy First**: Mai memorizzare nomi completi, solo iniziali
- **Error Handling**: Gestione robusta errori trascrizione/analisi
- **Performance**: Lazy loading per dashboard con molti dati
- **Scalability**: Considerare code per processing audio
- **Compliance**: Implementare audit trail per modifiche dati

### Testing Strategy
- Unit tests per utilities e funzioni NLP
- Integration tests per API endpoints
- E2E tests per flussi critici (upload + trascrizione)
- Security tests per autenticazione e autorizzazione

## Metriche di Successo
- Tempo medio trascrizione < 2 minuti per 1 ora di audio
- Accuratezza trascrizione > 95%
- Tempo caricamento dashboard < 3 secondi
- Zero data breach o violazioni privacy
- Uptime > 99.5%