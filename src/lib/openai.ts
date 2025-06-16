import OpenAI from 'openai'
import { createReadStream } from 'fs'

// Inizializza il client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Trascrive un file audio utilizzando OpenAI Whisper
 * @param audioFilePath - Percorso completo del file audio
 * @returns Promise<string> - Il testo trascritto
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '***REMOVED***your-openai-api-key-here') {
      throw new Error('OPENAI_API_KEY non configurata o non valida')
    }    console.log(`Avvio trascrizione per file: ${audioFilePath}`)
    
    // Crea un stream del file audio
    const audioStream = createReadStream(audioFilePath)
    
    // Chiama l'API Whisper di OpenAI
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
      language: 'it', // Italiano
      response_format: 'verbose_json', // Più dettagli nella risposta
      temperature: 0.0, // Massima accuratezza
      prompt: "Trascrivi accuratamente tutto il parlato in italiano. Ignora rumori di fondo, musiche o watermark."
    })

    console.log('Trascrizione completata con successo')
    console.log('Dettagli trascrizione:', {
      text: transcription.text?.substring(0, 100) + '...',
      language: transcription.language,
      duration: transcription.duration
    })
    
    return transcription.text || String(transcription)

  } catch (error) {
    console.error('Errore durante la trascrizione:', error)
    
    // Gestione di errori specifici
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        throw new Error('Limite di rate OpenAI raggiunto. Riprova tra qualche minuto.')
      }
      if (error.message.includes('insufficient_quota')) {
        throw new Error('Quota OpenAI esaurita. Verifica il tuo account OpenAI.')
      }
      if (error.message.includes('invalid_api_key')) {
        throw new Error('Chiave API OpenAI non valida. Verifica la configurazione.')
      }
    }
    
    throw new Error(`Errore durante la trascrizione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
  }
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
      throw new Error('OPENAI_API_KEY non configurata o non valida')
    }

    console.log(`Avvio analisi per sessione: ${sessionTitle}`)
    
    const prompt = `
Analizza la seguente trascrizione di una sessione terapeutica e fornisci un'analisi professionale strutturata.

Titolo sessione: ${sessionTitle}

Trascrizione:
${transcript}

Fornisci un'analisi strutturata che includa:

1. **TEMI PRINCIPALI**: Identifica i temi ricorrenti e le questioni centrali discusse
2. **STATO EMOTIVO**: Analisi del tono emotivo e dello stato d'animo del paziente
3. **PROGRESSI**: Eventuali segni di progresso o miglioramento rispetto a sessioni precedenti
4. **AREE DI ATTENZIONE**: Argomenti che richiedono ulteriore esplorazione
5. **RACCOMANDAZIONI**: Suggerimenti per le prossime sessioni

Mantieni un linguaggio professionale e clinico, rispettando la confidenzialità e la sensibilità del contenuto terapeutico.
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Sei un assistente specializzato nell\'analisi di sessioni terapeutiche. Fornisci analisi professionali, empatiche e clinicamente rilevanti.'
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
      throw new Error('Nessuna analisi generata da OpenAI')
    }

    console.log('Analisi completata con successo')
    return analysis

  } catch (error) {
    console.error('Errore durante l\'analisi:', error)
    throw new Error(`Errore durante l'analisi: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
  }
}
