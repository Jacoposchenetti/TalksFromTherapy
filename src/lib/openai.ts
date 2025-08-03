import OpenAI from 'openai'

// Inizializza il client OpenAI
export const openai = new OpenAI({
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
    error.code === 'rate_limit_exceeded'
  )
}

/**
 * Verifica se l'errore è di quota insufficiente (non rate limit)
 */
function isQuotaError(error: any): boolean {
  if (!error) return false
  
  const errorString = error.toString().toLowerCase()
  const message = error.message?.toLowerCase() || ''
  
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
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '***REMOVED***your-openai-api-key-here') {
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
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '***REMOVED***your-openai-api-key-here') {
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
 * Normalizza la struttura del transcript per garantire una formattazione consistente
 * @param transcript - Il testo da normalizzare
 * @returns string - Il testo normalizzato
 */
const normalizeTranscriptStructure = (transcript: string): string => {
  if (!transcript) return transcript;
  
  console.log('🔧 [Diarization] Normalizing transcript structure...');
  console.log('📝 [Diarization] Original transcript (first 200 chars):', transcript.substring(0, 200));
  
  // Rimuovi tutti i newline e metti tutto su una riga
  let normalized = transcript.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Aggiungi newline prima e dopo ogni speaker marker
  normalized = normalized
    .replace(/(PAZIENTE:|P:|Paziente:)/gi, '\n$1\n')
    .replace(/(TERAPEUTA:|T:|Terapeuta:)/gi, '\n$1\n')
    .replace(/(THERAPIST:|Therapist:)/gi, '\n$1\n');
  
  // Rimuovi newline multipli consecutivi e normalizza
  normalized = normalized
    .replace(/\n\s*\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
  
  // Se non ci sono speaker markers, aggiungi un marker di default per il paziente
  if (!/(PAZIENTE:|P:|Paziente:|TERAPEUTA:|T:|Terapeuta:|THERAPIST:|Therapist:)/gi.test(normalized)) {
    normalized = `Paziente:\n${normalized}`;
  }
  
  console.log('✅ [Diarization] Normalized transcript (first 200 chars):', normalized.substring(0, 200));
  console.log('🔍 [Diarization] Speaker markers found:', (normalized.match(/(PAZIENTE:|P:|Paziente:|TERAPEUTA:|T:|Terapeuta:|THERAPIST:|Therapist:)/gi) || []).length);
  
  return normalized;
};

/**
 * Diarizza una trascrizione utilizzando GPT-3.5-turbo per identificare i diversi interlocutori
 * @param transcript - Il testo trascritto da diarizzare
 * @param sessionTitle - Titolo della sessione per contesto
 * @param maxRetries - Numero massimo di tentativi (default: 5)
 * @returns Promise<string> - La trascrizione diarizzata con identificazione degli interlocutori
 */
export async function diarizeTranscript(transcript: string, sessionTitle: string, maxRetries: number = 5): Promise<string> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '***REMOVED***your-openai-api-key-here') {
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

  // Prompt migliorato per diarizzazione più solida e intelligente
  const promptBase = (chunk: string) => `
Analizza la seguente trascrizione di una sessione di terapia e identifica i diversi interlocutori.

Titolo della sessione: ${sessionTitle}

Trascrizione originale:
${chunk}

Il tuo compito è identificare quanti interlocutori ci sono e chi dice cosa. Tipicamente, in una sessione di terapia ci sono:
- Il terapeuta (che devi identificare sempre come "Terapeuta:")
- Il paziente (che devi identificare sempre come "Paziente:")

ISTRUZIONI DETTAGLIATE PER RICONOSCIMENTO E RIMOZIONE SIGLE/NOMINATIVI:

1. RICONOSCIMENTO SIGLE/NOMINATIVI: Prima di tutto, identifica TUTTE le sigle, iniziali, nomi o nominativi presenti nel testo che indicano gli attori, come:
   - Sigle: "T:", "P:", "D:", "Dott:", "Dr:", "Dott.ssa:", "Psicologo:", "Psicologa:"
   - Iniziali: "M.R.:", "D.R.:", "A.B.:", "C.M.:"
   - Nomi completi: "Dottor Rossi:", "Dottoressa Bianchi:", "Mario:", "Anna:"
   - Titoli: "Terapeuta:", "Paziente:", "Specialista:", "Consulente:"
   - Varianti: "Il terapeuta:", "La paziente:", "Il dottore dice:", "Lei dice:"

2. RIMOZIONE COMPLETA: Rimuovi COMPLETAMENTE tutte queste sigle/nominativi dall'inizio di ogni paragrafo/intervento. Non devono rimanere tracce nel testo finale.

3. CLASSIFICAZIONE INTELLIGENTE DEI RUOLI: Quando non ci sono sigle/nominativi espliciti, usa questi criteri per identificare i cambi di interlocutore:

   CRITERI PER IL TERAPEUTA:
   - Fa domande dirette: "Come si sente?", "Mi racconti...", "Cosa ne pensa?"
   - Usa linguaggio professionale e distaccato
   - Fa commenti di supporto: "Capisco", "Interessante", "Ottimo"
   - Chiede chiarimenti: "Nel senso...?", "Può spiegare meglio?"
   - Fa riferimento a sessioni precedenti: "Come abbiamo detto ieri..."
   - Usa "tu" quando si rivolge al paziente
   - Fa osservazioni terapeutiche: "Vedo che...", "Noto che..."

   CRITERI PER IL PAZIENTE:
   - Racconta esperienze personali e problemi
   - Usa "io", "me", "mio" frequentemente
   - Risponde alle domande del terapeuta
   - Usa linguaggio emotivo e personale
   - Fa riferimento a persone della sua vita: "mia sorella", "mio marito"
   - Racconta eventi specifici della sua vita
   - Esprime sentimenti e stati d'animo

4. RICONOSCIMENTO CAMBI DI SPEAKER: Presta particolare attenzione a:
   - Cambi di tono e registro linguistico
   - Passaggi da domande a risposte
   - Cambi di argomento o focus
   - Riferimenti diretti all'altro interlocutore ("tu", "lei", "dicevi")
   - Pause o interruzioni nel discorso

5. RIFORMATTAZIONE: Aggiungi SOLO i prefissi standardizzati:
   - "Terapeuta:" per tutti gli interventi del terapeuta
   - "Paziente:" per tutti gli interventi del paziente

6. PULIZIA OUTPUT: Assicurati che nell'output finale:
   - NON ci siano più sigle/nominativi originali
   - NON ci siano iniziali o nomi degli attori
   - NON ci siano riferimenti a "lui dice", "lei dice", "il dottore", ecc.
   - Ogni intervento inizi SOLO con "Terapeuta:" o "Paziente:"
   - Il contenuto sia pulito e privo di identificatori originali

7. FORMATTAZIONE OBBLIGATORIA: 
   - OGNI RIGA deve iniziare con "Terapeuta:" o "Paziente:" seguito da uno spazio
   - NON inserire testo senza prefisso di speaker
   - NON inserire righe vuote senza prefisso
   - Ogni intervento deve essere separato da UNA SOLA riga vuota
   - NON usare paragrafi o formattazione speciale
   - OGNI RIGA DI TESTO deve avere il prefisso appropriato

ESEMPIO DI FORMATTAZIONE CORRETTA:
INPUT:
Come si sente oggi? Ha fatto i compiti che le ho assegnato?
Sì, ho provato a fare quello che mi ha detto. È stato difficile all'inizio.
Capisco. Mi racconti come è andata?
Beh, ho iniziato a pensare a quello che abbiamo discusso la volta scorsa...

OUTPUT DESIDERATO (OGNI RIGA CON PREFISSO):
Terapeuta: Come si sente oggi? Ha fatto i compiti che le ho assegnato?

Paziente: Sì, ho provato a fare quello che mi ha detto. È stato difficile all'inizio.

Terapeuta: Capisco. Mi racconti come è andata?

Paziente: Beh, ho iniziato a pensare a quello che abbiamo discusso la volta scorsa...

REGOLE STRETTE DI FORMATTAZIONE:
- OGNI RIGA DI TESTO deve iniziare con "Terapeuta: " o "Paziente: "
- NON ci devono essere righe di testo senza prefisso
- NON ci devono essere paragrafi o blocchi di testo senza identificazione speaker
- OGNI intervento deve essere su una riga separata con il proprio prefisso

IMPORTANTE: Restituisci SOLO la trascrizione diarizzata pulita, senza alcun commento aggiuntivo. Rimuovi TUTTE le sigle/nominativi originali e assicurati che OGNI RIGA inizi con "Terapeuta: " o "Paziente: ".
`;

  let diarizedChunks: string[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Diarizing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Sei un assistente specializzato nella diarizzazione di trascrizioni di sessioni di terapia. Il tuo compito principale è RICONOSCERE e RIMUOVERE COMPLETAMENTE tutte le sigle, iniziali, nomi o nominativi degli attori presenti nel testo, sostituendoli con i prefissi standardizzati "Terapeuta:" e "Paziente:". È CRUCIALE che nell\'output finale non rimangano tracce degli identificatori originali, poiché questi alterano le analisi successive. Devi essere meticoloso nell\'identificazione e rimozione di tutti i possibili identificatori degli attori. Inoltre, quando non ci sono sigle esplicite, devi essere INTELLIGENTE nel riconoscere i cambi di interlocutore basandoti sul contenuto, sul tono, sul linguaggio e sul contesto della conversazione. Non assumere mai che tutto il testo sia di un solo speaker - analizza attentamente ogni passaggio per identificare i cambi di interlocutore. FORMATTAZIONE OBBLIGATORIA: OGNI RIGA DI TESTO deve iniziare con "Terapeuta: " o "Paziente: ". NON inserire mai testo senza prefisso di speaker. OGNI intervento deve essere su una riga separata con il proprio prefisso.'
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
        break; // Success, exit retry loop
        
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
  
  // Applica la normalizzazione della struttura del transcript
  const normalizedTranscript = normalizeTranscriptStructure(diarizedTranscript);
  
  console.log('✅ Diarization completed successfully');
  console.log(`📊 Diarized transcript length: ${normalizedTranscript.length} characters`);
  return normalizedTranscript;
}
