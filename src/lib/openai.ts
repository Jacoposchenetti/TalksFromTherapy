import OpenAI from 'openai'

// Inizializza il client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Sleep function per delay tra retry
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Verifica se l'errore è di tipo rate limit/quota
 */
function isRetryableError(error: any): boolean {
  if (!error) return false
  
  const errorString = error.toString().toLowerCase()
  const message = error.message?.toLowerCase() || ''
  
  return (
    errorString.includes('rate limit') ||
    errorString.includes('429') ||
    message.includes('rate limit') ||
    error.status === 429 ||
    error.code === 'rate_limit_exceeded' ||
    // IMPORTANTE: OpenAI usa "exceeded your current quota" per rate limit temporaneo
    (error.status === 429 && message.includes('exceeded your current quota'))
  )
}

/**
 * Verifica se l'errore è di quota insufficiente (non rate limit)
 */
function isQuotaError(error: any): boolean {
  if (!error) return false
  
  const errorString = error.toString().toLowerCase()
  const message = error.message?.toLowerCase() || ''
  
  // Status 429 con "exceeded your current quota" è un RATE LIMIT, non quota esaurita
  if (error.status === 429 && message.includes('exceeded your current quota')) {
    return false
  }
  
  // Controlla solo per insufficient_quota specifico, non generico "quota"
  // perché "exceeded your current quota" è spesso un rate limit, non quota insufficiente
  return (
    errorString.includes('insufficient_quota') ||
    message.includes('insufficient_quota') ||
    error.code === 'insufficient_quota' ||
    error.type === 'insufficient_quota'
  )
}

/**
 * Trascrive un file audio utilizzando OpenAI Whisper con retry logic migliorata
 * @param audioBuffer - Buffer del file audio
 * @param fileName - Nome del file audio per l'API
 * @param maxRetries - Numero massimo di tentativi (default: 5)
 * @returns Promise<string> - Il testo trascritto
 */
export async function transcribeAudio(audioBuffer: Buffer, fileName: string, maxRetries: number = 5): Promise<string> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
    throw new Error('OPENAI_API_KEY not configured or invalid')
  }

  console.log(`🎵 Starting transcription for file: ${fileName}`)
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Transcription attempt ${attempt}/${maxRetries}`)
      
      // Crea un File object dal buffer
      const audioFile = new File([audioBuffer], fileName, { 
        type: 'audio/mpeg' // Tipo generico per audio
      })
      
      // Chiama l'API Whisper di OpenAI
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'it', // Italiano
        response_format: 'verbose_json', // Più dettagli nella risposta
        temperature: 0.0, // Massima accuratezza
        prompt: "Trascrivi accuratamente tutto il parlato in italiano. Includi tutte le voci, pause e parlato sovrapposto. Ignora rumori di fondo, musiche o watermark."
      })

      console.log('✅ Trascrizione completata con successo')
      console.log('📊 Dettagli trascrizione:', {
        text: transcription.text?.substring(0, 150) + '...',
        language: transcription.language,
        duration: transcription.duration
      })
      
      return transcription.text || String(transcription)

    } catch (error) {
      console.error(`❌ Errore durante tentativo ${attempt}:`, error)
      
      // Analisi dell'errore per decidere se fare retry
      const shouldRetry = attempt < maxRetries && (
        isRetryableError(error) ||
        (error instanceof Error && error.message.includes('timeout')) ||
        (error instanceof Error && error.message.includes('network')) ||
        (error instanceof Error && error.message.includes('connection'))
      )
      
      if (!shouldRetry) {
        // Gestione di errori specifici per l'ultimo tentativo
        if (error instanceof Error) {
          if (isQuotaError(error)) {
            throw new Error('❌ Quota OpenAI esaurita. Controlla il tuo account OpenAI e i limiti di utilizzo.')
          }
          if (isRetryableError(error)) {
            throw new Error('❌ Rate limit OpenAI raggiunto. Riprova tra qualche minuto. Se il problema persiste, potrebbe essere un limite temporaneo di OpenAI.')
          }
          if (error.message.includes('invalid_api_key')) {
            throw new Error('❌ Chiave API OpenAI non valida. Controlla la configurazione.')
          }
          if (error.message.includes('file_size')) {
            throw new Error('❌ File audio troppo grande per OpenAI Whisper (max 25MB).')
          }
          if (error.message.includes('unsupported_file')) {
            throw new Error('❌ Formato file audio non supportato da OpenAI Whisper.')
          }
        }
        
        throw new Error(`Error during transcription: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      // Calcola il tempo di attesa con backoff esponenziale + jitter
      const baseWaitTime = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s, 16s, 32s...
      const jitter = Math.random() * 1000 // Aggiunge 0-1s random per evitare "thundering herd"
      const waitTime = Math.min(baseWaitTime + jitter, 60000) // Max 60s
      
      console.log(`⏳ Errore temporaneo (tentativo ${attempt}). Attendo ${Math.round(waitTime/1000)}s prima del prossimo tentativo...`)
      await sleep(waitTime)
    }
  }
  
  throw new Error('❌ Trascrizione fallita dopo tutti i tentativi')
}

/**
 * Analizza un testo trascritto utilizzando GPT per estrarre insights terapeutici
 * @param transcript - Il testo trascritto da analizzare
 * @param sessionTitle - Titolo della sessione per contesto
 * @returns Promise<string> - L'analisi del testo
 */
export async function analyzeTranscript(transcript: string, sessionTitle: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      throw new Error('OPENAI_API_KEY not configured or invalid')
    }

    console.log(`Starting analysis for session: ${sessionTitle}`)
    
    const prompt = `
Analyze the following transcript of a therapy session and provide a structured professional analysis.

Session title: ${sessionTitle}

Transcript:
${transcript}

Provide a structured analysis that includes:

1. **MAIN THEMES**: Identify recurring themes and central issues discussed
2. **EMOTIONAL STATE**: Analysis of the patient's emotional tone and mood
3. **PROGRESS**: Any signs of progress or improvement compared to previous sessions
4. **AREAS OF ATTENTION**: Topics that require further exploration
5. **RECOMMENDATIONS**: Suggestions for upcoming sessions

Use professional and clinical language, respecting confidentiality and the sensitivity of therapeutic content.
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an assistant specialized in the analysis of therapy sessions. Provide professional, empathetic, and clinically relevant analyses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    })

    const analysis = completion.choices[0]?.message?.content
    if (!analysis) {
      throw new Error('No analysis generated by OpenAI')
    }

    console.log('Analysis completed successfully')
    return analysis

  } catch (error) {
    console.error('Errore durante l\'analisi:', error)
    throw new Error(`Error during analysis: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Diarizza una trascrizione utilizzando GPT-3.5-turbo per identificare i diversi interlocutori con retry logic
 * @param transcript - Il testo trascritto da diarizzare
 * @param sessionTitle - Titolo della sessione per contesto
 * @param maxRetries - Numero massimo di tentativi (default: 5)
 * @returns Promise<string> - La trascrizione diarizzata con identificazione degli interlocutori
 */
export async function diarizeTranscript(transcript: string, sessionTitle: string, maxRetries: number = 5): Promise<string> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
    throw new Error('OPENAI_API_KEY not configured or invalid')
  }

  console.log(`🎭 Starting diarization for session: ${sessionTitle}`)
  console.log(`📄 Original transcript length: ${transcript.length} characters`)

  // Limiti modello GPT-3.5-turbo: ~16k token, ma lasciamo margine per prompt e risposta
  const MAX_CHARS_PER_CHUNK = 6000; // Sicuro per prompt + risposta
  const chunks: string[] = [];
  if (transcript.length > MAX_CHARS_PER_CHUNK) {
    // Prova a spezzare su doppio newline (paragrafi), poi su frasi
    let current = '';
    for (const paragraph of transcript.split(/\n\n+/)) {
      if ((current + '\n\n' + paragraph).length > MAX_CHARS_PER_CHUNK) {
        if (current) chunks.push(current);
        current = paragraph;
      } else {
        current = current ? current + '\n\n' + paragraph : paragraph;
      }
    }
    if (current) chunks.push(current);
    // Se ancora qualche chunk è troppo lungo, spezza su frasi
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].length > MAX_CHARS_PER_CHUNK) {
        const sentences = chunks[i].split(/(?<=[.!?])\s+/);
        let subCurrent = '';
        const subChunks: string[] = [];
        for (const sentence of sentences) {
          if ((subCurrent + ' ' + sentence).length > MAX_CHARS_PER_CHUNK) {
            if (subCurrent) subChunks.push(subCurrent);
            subCurrent = sentence;
          } else {
            subCurrent = subCurrent ? subCurrent + ' ' + sentence : sentence;
          }
        }
        if (subCurrent) subChunks.push(subCurrent);
        // Sostituisci il chunk troppo lungo con i subchunk
        chunks.splice(i, 1, ...subChunks);
        i += subChunks.length - 1;
      }
    }
  } else {
    chunks.push(transcript);
  }

  // Prompt in italiano (come già impostato)
  const promptBase = (chunk: string) => `
Analizza la seguente trascrizione di una sessione di terapia e identifica i diversi interlocutori.

Titolo della sessione: ${sessionTitle}

Trascrizione originale:
${chunk}

Il tuo compito è identificare quanti interlocutori ci sono e chi dice cosa. Tipicamente, in una sessione di terapia ci sono:
- Il terapeuta (che devi identificare sempre come "Terapeuta:")
- Il paziente (che devi identificare sempre come "Paziente:")

Istruzioni:
1. Analizza il contenuto per individuare i cambi di interlocutore.
2. Se la trascrizione contiene già etichette, nomi o ruoli (ad esempio "Dott.ssa Rossi:", "Mario:", "Psicologo:", "T:"), sostituiscili TUTTI con solo due ruoli: "Terapeuta:" e "Paziente:". Rimuovi ogni nome, iniziale o titolo originale.
3. Se non ci sono etichette, deduci i cambi di interlocutore e assegna il ruolo corretto.
4. Riformatta la trascrizione aggiungendo sempre e solo i prefissi "Terapeuta:" o "Paziente:" prima di ogni intervento.
5. Mantieni tutto il contenuto originale, modifica solo i prefissi.
6. Usa SEMPRE e SOLO il formato "Terapeuta:" o "Paziente:" prima di ogni intervento, in italiano.
7. Ogni intervento deve essere separato da UNA SOLA riga vuota (un solo a capo tra una battuta e la successiva, senza righe doppie o triple).

Esempio di output desiderato:
Terapeuta: Buongiorno, come si sente oggi?

Paziente: Bene, grazie. Ho fatto il compito che mi ha dato.

Terapeuta: Ottimo, mi racconti com'è andata?

Restituisci SOLO la trascrizione diarizzata, senza alcun commento aggiuntivo.
`;

  let diarizedChunks: string[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`🔄 Diarizing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📝 Diarization attempt ${attempt}/${maxRetries} for chunk ${i + 1}`);
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Sei un assistente specializzato nella diarizzazione di trascrizioni di sessioni di terapia. Il tuo compito è identificare i diversi interlocutori e riformattare la trascrizione aggiungendo prefissi chiari per ogni persona che parla.'
            },
            {
              role: 'user',
              content: promptBase(chunk)
            }
          ],
          temperature: 0.1,
          max_tokens: 4000,
        });
        
        const diarized = completion.choices[0]?.message?.content;
        if (!diarized) {
          throw new Error('No diarized transcript generated by OpenAI for chunk ' + (i + 1));
        }
        
        diarizedChunks.push(diarized.trim());
        console.log(`✅ Chunk ${i + 1} diarized successfully`);
        break; // Esci dal loop dei tentativi se ha successo
        
      } catch (error) {
        console.error(`❌ Errore durante tentativo ${attempt} per chunk ${i + 1}:`, error);
        
        // Analisi dell'errore per decidere se fare retry
        const shouldRetry = attempt < maxRetries && (
          isRetryableError(error) ||
          (error instanceof Error && error.message.includes('timeout')) ||
          (error instanceof Error && error.message.includes('network')) ||
          (error instanceof Error && error.message.includes('connection'))
        )
        
        if (!shouldRetry) {
          // Gestione di errori specifici per l'ultimo tentativo
          if (error instanceof Error) {
            if (isQuotaError(error)) {
              throw new Error('❌ Quota OpenAI esaurita durante la diarizzazione. Controlla il tuo account OpenAI.')
            }
            if (isRetryableError(error)) {
              throw new Error('❌ Rate limit OpenAI raggiunto durante la diarizzazione. Riprova tra qualche minuto.')
            }
            if (error.message.includes('invalid_api_key')) {
              throw new Error('❌ Chiave API OpenAI non valida durante la diarizzazione.')
            }
          }
          
          throw new Error(`Error during diarization of chunk ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
        
        // Calcola il tempo di attesa con backoff esponenziale + jitter
        const baseWaitTime = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s, 16s, 32s...
        const jitter = Math.random() * 1000 // Aggiunge 0-1s random
        const waitTime = Math.min(baseWaitTime + jitter, 60000) // Max 60s
        
        console.log(`⏳ Errore temporaneo chunk ${i + 1} (tentativo ${attempt}). Attendo ${Math.round(waitTime/1000)}s...`)
        await sleep(waitTime)
      }
    }
  }
  
  const diarizedTranscript = diarizedChunks.join('\n');
  // Normalizza: un solo a capo tra ogni battuta (Terapeuta:/Paziente:)
  const normalizedTranscript = diarizedTranscript
    .replace(/\s*\n\s*/g, '\n') // elimina spazi extra attorno agli a capo
    .replace(/\n{2,}/g, '\n') // sostituisci doppi/tripli a capo con uno solo
    .replace(/(Terapeuta:|Paziente:)/g, '\n$1') // assicura che ogni battuta inizi su una nuova riga
    .replace(/^\n+/, '') // rimuovi eventuali a capo iniziali
    .replace(/\n+$/, ''); // rimuovi eventuali a capo finali
    
  console.log('✅ Diarization completed successfully');
  console.log(`📊 Diarized transcript length: ${normalizedTranscript.length} characters`);
  return normalizedTranscript;
}
