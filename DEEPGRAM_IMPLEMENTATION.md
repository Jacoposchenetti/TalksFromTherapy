# Implementazione Deepgram - Piano di Implementazione 📋

## 🎯 Obiettivo
✅ **Integrare Deepgram come servizio di trascrizione secondario/fallback per TalksFromTherapy**

## 🌟 Vantaggi di Deepgram

### Perché Aggiungere Deepgram?
- 🚀 **Performance**: Trascrizione in tempo reale più veloce di Whisper
- 💰 **Costi**: Pricing competitivo, specialmente per volumi elevati
- 🎯 **Accuratezza**: Ottimizzato per conversazioni e dialoghi
- 🔧 **Flessibilità**: Supporto per modelli personalizzati
- 📊 **Analytics**: Metriche dettagliate su confidence e speaker diarization
- 🌍 **Lingue**: Supporto eccellente per italiano e altre lingue

### Caratteristiche Uniche
- **Speaker Diarization**: Identificazione automatica di chi parla
- **Punctuation & Formatting**: Punteggiatura automatica intelligente
- **Confidence Scores**: Punteggi di fiducia per ogni parola
- **Custom Models**: Possibilità di training per terminologia medica
- **Streaming**: Trascrizione in tempo reale durante l'upload

## 🏗️ Architettura Proposta

### Sistema Multi-Provider
```
Trascrizione Request
        ↓
   Provider Selection
   ┌─────────────────┐
   │ Primary: Whisper │ ← Default per accuratezza
   │ Fallback: Deepgram │ ← Se Whisper fallisce/lento
   │ User Choice: Both │ ← Opzione utente
   └─────────────────┘
        ↓
   Risultato Unificato
```

### Strategia di Fallback
1. **Tentativo Primario**: OpenAI Whisper (già implementato)
2. **Fallback Automatico**: Se Whisper fallisce → Deepgram
3. **Scelta Utente**: Opzione per preferire Deepgram
4. **Comparazione**: Opzione per trascrizione doppia (A/B testing)

## 🔧 Modifiche da Implementare

### 1. Configurazione Environment
```bash
# .env - Aggiungi variabili Deepgram
DEEPGRAM_API_KEY="b3632d182a754fa7d5637d0236780dfc44b9b14f"
DEEPGRAM_PROJECT_ID="your-project-id"  # Opzionale
TRANSCRIPTION_PROVIDER="whisper"        # whisper | deepgram | both
TRANSCRIPTION_FALLBACK="true"          # Auto-fallback abilitato
```

### 2. Servizio Deepgram (`/lib/deepgram.ts`)
```typescript
// Nuovo file da creare
import { createClient } from '@deepgram/sdk'

export class DeepgramService {
  private client: any
  
  constructor() {
    this.client = createClient(process.env.DEEPGRAM_API_KEY!)
  }
  
  async transcribeAudio(audioPath: string): Promise<TranscriptionResult>
  async transcribeStream(audioStream: ReadableStream): Promise<TranscriptionResult>
  async getUsage(): Promise<UsageStats>
}
```

### 3. Provider Manager (`/lib/transcription-provider.ts`)
```typescript
// Nuovo file da creare
export enum TranscriptionProvider {
  WHISPER = 'whisper',
  DEEPGRAM = 'deepgram'
}

export class TranscriptionManager {
  async transcribe(audioPath: string, provider?: TranscriptionProvider)
  async transcribeWithFallback(audioPath: string)
  async compareProviders(audioPath: string) // A/B testing
}
```

### 4. API Updates (`/api/transcribe/route.ts`)
```typescript
// Modifiche al file esistente
export async function POST(request: Request) {
  // ... existing code ...
  
  try {
    // Tentativo con provider primario
    result = await transcriptionManager.transcribe(audioPath, primaryProvider)
  } catch (primaryError) {
    // Fallback automatico
    if (fallbackEnabled) {
      result = await transcriptionManager.transcribe(audioPath, fallbackProvider)
    }
  }
}
```

### 5. Database Schema Updates (`/prisma/schema.prisma`)
```prisma
// Aggiungi campi alla tabella Session
model Session {
  // ... existing fields ...
  
  transcriptionProvider   String?           // whisper | deepgram
  transcriptionMetadata   Json?             // Confidence, speakers, timing
  transcriptionDuration   Int?              // Tempo di trascrizione (ms)
  transcriptionCost       Decimal?          // Costo della trascrizione
  fallbackUsed           Boolean @default(false) // Se è stato usato fallback
  
  // Opzionale: Trascrizioni multiple per comparazione
  transcriptions         Transcription[]
}

// Nuova tabella per comparazione A/B
model Transcription {
  id                     String   @id @default(cuid())
  sessionId              String
  provider               String   // whisper | deepgram
  transcript             String
  confidence             Float?
  metadata               Json?
  duration               Int?
  cost                   Decimal?
  createdAt              DateTime @default(now())
  
  session                Session  @relation(fields: [sessionId], references: [id])
}
```

### 6. UI Enhancements

#### Settings Page (`/app/settings/page.tsx`)
```typescript
// Nuova pagina per configurazione provider
export default function SettingsPage() {
  return (
    <div>
      <h2>Impostazioni Trascrizione</h2>
      
      <Select name="provider">
        <option value="whisper">OpenAI Whisper (Più Accurato)</option>
        <option value="deepgram">Deepgram (Più Veloce)</option>
        <option value="both">Entrambi (Comparazione)</option>
      </Select>
      
      <Checkbox name="fallback">
        Usa fallback automatico
      </Checkbox>
    </div>
  )
}
```

#### Enhanced Session UI
```typescript
// In /app/sessions/page.tsx - Aggiungi info provider
<Badge variant={session.transcriptionProvider === 'whisper' ? 'blue' : 'green'}>
  {session.transcriptionProvider?.toUpperCase() || 'WHISPER'}
</Badge>

{session.fallbackUsed && (
  <Badge variant="yellow">FALLBACK</Badge>
)}
```

### 7. Debug & Monitoring (`/app/debug/page.tsx`)
```typescript
// Estendi pagina debug esistente
export default function DebugPage() {
  return (
    <div>
      {/* Existing debug info */}
      
      <section>
        <h3>Deepgram Status</h3>
        <StatusIndicator service="deepgram" />
        <Button onClick={testDeepgram}>Test Deepgram</Button>
      </section>
      
      <section>
        <h3>Provider Comparison</h3>
        <Button onClick={compareProviders}>
          Compare Whisper vs Deepgram
        </Button>
      </section>
    </div>
  )
}
```

## 📦 Dipendenze da Installare

### Package Deepgram SDK
```bash
npm install @deepgram/sdk
npm install --save-dev @types/node
```

### Package.json Updates
```json
{
  "dependencies": {
    "@deepgram/sdk": "^3.4.0",
    // ... existing dependencies
  }
}
```

## 🚀 Piano di Implementazione

### Fase 1: Setup Base (1-2 giorni)
1. ✅ **Installazione**: Deepgram SDK e setup environment
2. ✅ **Servizio Base**: Implementare `DeepgramService` class
3. ✅ **Test**: Creare endpoint `/api/test-deepgram`
4. ✅ **Debug**: Aggiungere sezione Deepgram alla pagina debug

### Fase 2: Provider Manager (1 giorno)
1. ✅ **Abstraction**: Creare `TranscriptionManager` class
2. ✅ **Strategy Pattern**: Implementare selezione provider
3. ✅ **Fallback Logic**: Sistema di fallback automatico
4. ✅ **Error Handling**: Gestione errori specifici per provider

### Fase 3: Database & Schema (1 giorno)
1. ✅ **Migration**: Aggiungere campi provider alla tabella Session
2. ✅ **Optional**: Tabella Transcription per comparazioni
3. ✅ **Metadata**: Supporto per confidence scores e timing
4. ✅ **Cost Tracking**: Monitoraggio costi per provider

### Fase 4: UI & Settings (1-2 giorni)
1. ✅ **Settings Page**: Interfaccia per selezione provider
2. ✅ **Session UI**: Badge e indicatori provider
3. ✅ **Debug Page**: Tools per test e comparazione
4. ✅ **Analytics**: Dashboard usage e performance

### Fase 5: Advanced Features (Opzionale)
1. ✅ **Speaker Diarization**: Chi parla quando
2. ✅ **Custom Models**: Training per terminologia medica  
3. ✅ **Real-time**: Trascrizione streaming durante upload
4. ✅ **Analytics**: Metriche dettagliate e reporting

## 🔧 Configurazione Deepgram

### 1. Account Setup
```bash
# 1. Registrati su https://console.deepgram.com
# 2. Crea un nuovo progetto
# 3. Genera API Key
# 4. Configura billing (ha free tier)
```

### 2. API Key Configuration
```bash
# Nel file .env
DEEPGRAM_API_KEY="b3632d182a754fa7d5637d0236780dfc44b9b14f"
DEEPGRAM_PROJECT_ID="your-project-id"
```

### 3. Test della Configurazione
```bash
# Test rapido via curl
curl -X POST \
  https://api.deepgram.com/v1/listen \
  -H "Authorization: Token b3632d182a754fa7d5637d0236780dfc44b9b14f" \
  -H "Content-Type: audio/mp3" \
  --data-binary @your-audio-file.mp3
```

## 📊 Comparazione Provider

### OpenAI Whisper vs Deepgram

| Caratteristica | Whisper | Deepgram | Vincitore |
|----------------|---------|-----------|-----------|
| **Accuratezza** | Eccellente | Ottima | Whisper |
| **Velocità** | Buona | Eccellente | Deepgram |
| **Costo** | Moderato | Variabile | Dipende |
| **Lingue** | 99+ | 30+ | Whisper |
| **Speaker ID** | No | Sì | Deepgram |
| **Real-time** | No | Sì | Deepgram |
| **Punteggiatura** | Buona | Eccellente | Deepgram |
| **Custom Models** | No | Sì | Deepgram |

### Raccomandazioni d'Uso

#### Usa Whisper quando:
- ✅ Massima accuratezza richiesta
- ✅ Audio di qualità variabile
- ✅ Linguaggio tecnico/medico complesso
- ✅ Budget fisso/prevedibile

#### Usa Deepgram quando:
- ✅ Velocità è prioritaria
- ✅ Serve identificazione speaker
- ✅ Audio di buona qualità
- ✅ Volumi elevati di trascrizione

#### Usa Entrambi quando:
- ✅ Massima affidabilità (fallback)
- ✅ A/B testing per ottimizzazione
- ✅ Validazione incrociata risultati
- ✅ Analisi comparative dei costi

## 🔮 Roadmap Futura

### Integrazioni Avanzate
1. **AI Analysis**: Combinare trascrizioni per migliore analisi
2. **Cost Optimization**: Algoritmi per selezione provider ottimale
3. **Quality Scoring**: Sistema di scoring qualità trascrizioni
4. **Batch Processing**: Sistema code per elaborazioni massive

### Features Premium
1. **Custom Vocabulary**: Training terminologia medica/psicologica
2. **Emotion Detection**: Analisi del tono emotivo (Deepgram)
3. **Summary Generation**: Riassunti automatici delle sessioni
4. **Trend Analysis**: Analytics longitudinali sui pazienti

## 🛠️ Troubleshooting

### Errori Comuni

#### Deepgram API Key Invalida
```bash
Error: 401 Unauthorized
Soluzione: Verifica API key in .env e console Deepgram
```

#### Rate Limiting
```bash
Error: 429 Too Many Requests  
Soluzione: Implementa retry logic con exponential backoff
```

#### Audio Format Non Supportato
```bash
Error: Unsupported media type
Soluzione: Converti audio o usa format detection
```

### Best Practices
1. ✅ **Sempre** testa con file audio reali
2. ✅ **Monitor** usage e costi regolarmente  
3. ✅ **Implement** proper error handling e logging
4. ✅ **Consider** privacy e GDPR compliance
5. ✅ **Document** ogni configurazione e scelta di design

## 📚 Risorse Utili

### Documentazione
- [Deepgram API Docs](https://developers.deepgram.com/)
- [Deepgram Node.js SDK](https://github.com/deepgram/deepgram-node-sdk)
- [Deepgram Pricing](https://deepgram.com/pricing)

### Tools & Testing
- [Deepgram Console](https://console.deepgram.com/)
- [Audio Format Converter](https://convertio.co/audio-converter/)
- [Deepgram Live Test](https://console.deepgram.com/live-test)

---

**Status**: 📋 Pianificazione Completata - Pronto per Implementazione
**Estimated Effort**: 5-7 giorni di sviluppo
**Priority**: Medium (Enhancement, non critical)
