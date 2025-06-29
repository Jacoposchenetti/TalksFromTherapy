# Funzionalità di Diarizzazione

## Panoramica

La funzionalità di diarizzazione identifica automaticamente i diversi interlocutori in una trascrizione di sessione terapeutica e riformatta il testo aggiungendo prefissi chiari per ogni persona che parla.

## Come Funziona

### Flusso Automatico
1. **Trascrizione Iniziale**: OpenAI Whisper trascrive il file audio
2. **Diarizzazione**: GPT-3.5-turbo analizza la trascrizione e identifica i diversi interlocutori
3. **Salvataggio**: La trascrizione diarizzata viene salvata nel database

### Flusso Manuale
- Pulsante "Diarizza" disponibile per trascrizioni esistenti
- Permette di ri-diarizzare trascrizioni già processate

## API Endpoints

### POST /api/transcribe
Trascrive un file audio e applica automaticamente la diarizzazione.

**Request:**
```json
{
  "sessionId": "session_id_here"
}
```

**Response:**
```json
{
  "message": "Trascrizione e diarizzazione completate con successo",
  "sessionId": "session_id_here",
  "status": "TRANSCRIBED",
  "transcript": "Terapeuta: Buongiorno, come si sente oggi?\nPaziente: Bene, grazie...",
  "initialTranscriptLength": 500,
  "diarizedTranscriptLength": 520
}
```

### POST /api/diarize-transcript
Diarizza una trascrizione esistente.

**Request:**
```json
{
  "sessionId": "session_id_here"
}
```

**Response:**
```json
{
  "message": "Diarizzazione completata con successo",
  "sessionId": "session_id_here",
  "originalTranscriptLength": 500,
  "diarizedTranscriptLength": 520,
  "transcript": "Terapeuta: Buongiorno, come si sente oggi?\nPaziente: Bene, grazie..."
}
```

## Funzioni Principali

### `diarizeTranscript(transcript: string, sessionTitle: string): Promise<string>`

Analizza una trascrizione e identifica i diversi interlocutori utilizzando GPT-3.5-turbo.

**Parametri:**
- `transcript`: Il testo trascritto da diarizzare
- `sessionTitle`: Titolo della sessione per contesto

**Ritorna:**
- La trascrizione diarizzata con prefissi per ogni interlocutore

**Esempio di Output:**
```
Terapeuta: Buongiorno, come si sente oggi?
Paziente: Bene, grazie. Ho fatto i compiti che mi aveva dato.
Terapeuta: Ottimo, mi racconti come è andata?
Paziente: Beh, all'inizio è stato difficile, ma poi ho capito che dovevo essere più paziente con me stesso.
```

## Interfaccia Utente

### Pulsante Diarizza
- Disponibile per sessioni con status "TRANSCRIBED"
- Icona: Users (👥)
- Colore: Viola
- Mostra stato di caricamento durante il processo

### Posizione
Il pulsante appare nella sezione delle azioni della sessione, tra "Trascrizione" e "Export".

## Configurazione

### Variabili d'Ambiente
- `OPENAI_API_KEY`: Chiave API OpenAI (richiesta)

### Modello OpenAI
- **Modello**: gpt-3.5-turbo
- **Temperatura**: 0.1 (bassa per massima consistenza)
- **Max Tokens**: 4000 (per gestire trascrizioni lunghe)

## Gestione Errori

### Errori Comuni
1. **API Key non configurata**: Verifica `OPENAI_API_KEY`
2. **Quota esaurita**: Verifica il credito OpenAI
3. **Rate limit**: Riprova tra qualche minuto
4. **Trascrizione vuota**: Verifica che il file audio contenga parlato

### Logging
Il sistema registra dettagliatamente ogni step del processo:
- Avvio diarizzazione
- Lunghezza trascrizione originale
- Completamento diarizzazione
- Lunghezza trascrizione diarizzata
- Errori con stack trace

## Test

### File di Test
`test-diarization.js` contiene un esempio di trascrizione di test per verificare la funzionalità.

### Esecuzione Test
```bash
node test-diarization.js
```

## Vantaggi

1. **Identificazione Automatica**: Non richiede intervento manuale
2. **Alta Accuratezza**: Utilizza GPT-3.5-turbo per analisi semantica
3. **Formato Chiaro**: Prefissi standardizzati per ogni interlocutore
4. **Flessibilità**: Funziona sia automaticamente che manualmente
5. **Integrazione**: Si integra perfettamente nel flusso esistente

## Limitazioni

1. **Dipende da OpenAI**: Richiede connessione internet e credito API
2. **Costo**: Ogni diarizzazione consuma token OpenAI
3. **Accuratezza**: Dipende dalla qualità della trascrizione iniziale
4. **Lingua**: Ottimizzato per italiano, ma funziona con altre lingue

## Roadmap

- [ ] Supporto per più di 2 interlocutori
- [ ] Identificazione automatica dei nomi
- [ ] Timestamp per ogni intervento
- [ ] Export in formato dialogico
- [ ] Analisi delle emozioni per interlocutore 