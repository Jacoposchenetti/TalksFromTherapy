import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, sanitizeInput, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { createClient } from "@supabase/supabase-js"
import { transcribeAudio, diarizeTranscript } from "@/lib/openai"
import { openai } from "@/lib/openai"
import { encryptIfSensitive, decryptIfEncrypted } from "@/lib/encryption"

const MAX_TOKENS_PER_CHUNK = 3000 // Safe limit for GPT 3.5 turbo input
const MAX_SUMMARY_TOKENS = 1000 // Limit for summary output

// Function to split transcript into chunks respecting sentence boundaries
function splitTranscriptIntoChunks(transcript: string): string[] {
  const sentences = transcript.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let currentChunk = ""

  for (const sentence of sentences) {
    // Rough token estimation (1 token ≈ 4 characters)
    const estimatedTokens = (currentChunk + sentence).length / 4

    if (estimatedTokens > MAX_TOKENS_PER_CHUNK && currentChunk.trim()) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

// Function to generate summary for a single chunk
async function generateChunkSummary(chunk: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Sei un assistente esperto nell'analisi di trascrizioni di sessioni terapeutiche. 
          Il tuo compito è creare un riassunto conciso ma completo di una sezione di trascrizione.
          
          Istruzioni:
          - Mantieni tutti i punti chiave e le informazioni importanti
          - Preserva il contesto emotivo e le dinamiche relazionali
          - Usa un linguaggio professionale ma accessibile
          - Non aggiungere interpretazioni o giudizi personali
          - Mantieni la cronologia degli eventi discussi
          - Scrivi dal punto di vista del terapeuta, come se fosse un resoconto clinico
          - Limita il riassunto a ${MAX_SUMMARY_TOKENS} token massimo`
        },
        {
          role: "user",
          content: `Genera un riassunto della seguente sezione di trascrizione terapeutica:\n\n${chunk}`
        }
      ],
      max_tokens: MAX_SUMMARY_TOKENS,
      temperature: 0.3
    })

    return response.choices[0]?.message?.content?.trim() || ""
  } catch (error) {
    console.error("Error generating chunk summary:", error)
    throw error
  }
}

// Function to combine multiple summaries into a final summary
async function combineSummaries(summaries: string[]): Promise<string> {
  if (summaries.length === 1) {
    return summaries[0]
  }

  try {
    const combinedText = summaries.join("\n\n")
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Sei un assistente esperto nell'analisi di trascrizioni di sessioni terapeutiche.
          Il tuo compito è combinare più riassunti parziali in un unico riassunto coerente.
          
          Istruzioni:
          - Crea una narrazione fluida e logica che rappresenti una singola sessione terapeutica
          - I riassunti parziali rappresentano sezioni consecutive della stessa sessione, non sessioni separate
          - Tratta i contenuti come momenti successivi di un'unica conversazione terapeutica
          - Mantieni TUTTE le informazioni dai riassunti parziali
          - Non aggiungere informazioni non presenti nei riassunti originali
          - Organizza le informazioni in modo cronologico e tematico
          - Elimina eventuali ripetizioni
          - Mantieni il focus sui contenuti terapeutici e relazionali
          - Scrivi il riassunto dal punto di vista del terapeuta, come se fosse un resoconto clinico
          - Usa un linguaggio professionale ma accessibile
          - Limita il riassunto finale a ${MAX_SUMMARY_TOKENS * 2} token massimo`
        },
        {
          role: "user",
          content: `Combina i seguenti riassunti parziali in un unico riassunto coerente:\n\n${combinedText}`
        }
      ],
      max_tokens: MAX_SUMMARY_TOKENS * 2,
      temperature: 0.3
    })

    return response.choices[0]?.message?.content?.trim() || ""
  } catch (error) {
    console.error("Error combining summaries:", error)
    throw error
  }
}

// Client supabase con service role per operazioni RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const runtime = 'nodejs'

// POST /api/transcribe-new - Avvia trascrizione di una sessione
export async function POST(request: NextRequest) {
  try {
    // STEP 1: Verifica autorizzazione
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("🚀🚀🚀 POST /api/transcribe-new - VERSIONE NUOVA - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Validazione input
    const requestData = await request.json()
    
    if (!validateApiInput(requestData, ['sessionId'])) {
      return createErrorResponse("Dati richiesta non validi - sessionId richiesto", 400)
    }

    const sessionId = sanitizeInput(requestData.sessionId)
    console.log("🔍 Dati validati:", { sessionId })

    console.log(`🔍 Ricerca sessione con ID: ${sessionId}`)
    console.log(`👤 User ID: ${authResult.user!.id}`)

    // STEP 3: Verifica accesso alla risorsa
    const { data: sessionRecord, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, userId, status, audioFileName, audioUrl, title, patientId')
      .eq('id', sessionId)
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)
      .single()

    console.log("📊 Query Supabase completata", { 
      found: !!sessionRecord, 
      sessionId,
      status: sessionRecord?.status,
      audioFileName: sessionRecord?.audioFileName,
      error: sessionError
    })

    if (sessionError || !sessionRecord) {
      console.log(`❌ Sessione non trovata su Supabase:`, sessionError)
      return NextResponse.json(
        { error: "Sessione non trovata" },
        { status: 404 }
      )
    }

    console.log(`✅ Sessione trovata su Supabase:`, {
      id: sessionRecord.id,
      title: sessionRecord.title,
      status: sessionRecord.status,
      audioFileName: sessionRecord.audioFileName,
      userId: sessionRecord.userId
    })

    if (sessionRecord.status !== "UPLOADED") {
      console.log(`⚠️ Stato sessione attuale: "${sessionRecord.status}" (expected: "UPLOADED")`)
      return NextResponse.json(
        { 
          error: `La sessione deve essere in stato UPLOADED per avviare la trascrizione. Stato attuale: ${sessionRecord.status}`,
          currentStatus: sessionRecord.status,
          sessionId: sessionRecord.id
        },
        { status: 400 }
      )
    }

    if (!sessionRecord.audioFileName) {
      return NextResponse.json(
        { error: "Nessun file audio trovato per questa sessione" },
        { status: 400 }
      )
    }

    console.log(`🔄 Aggiornamento stato a TRANSCRIBING...`)

    // Aggiorna lo stato a TRANSCRIBING su Supabase
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ 
        status: "TRANSCRIBING",
        updatedAt: new Date()
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[Supabase] Error updating session status to TRANSCRIBING:', updateError)
      return NextResponse.json(
        { error: "Errore nell'aggiornamento dello stato sessione" },
        { status: 500 }
      )
    }

    console.log(`✅ Stato aggiornato a TRANSCRIBING`)

    try {
      // Scarica il file audio da Supabase Storage
      const filePath = `${sessionRecord.userId}/${sessionRecord.audioFileName}`
      
      console.log(`🚀 DOWNLOAD FILE AUDIO DA SUPABASE STORAGE:`)
      console.log(`   📁 Bucket: talksfromtherapy`)
      console.log(`   📂 Path: ${filePath}`)
      console.log(`   👤 User ID: ${sessionRecord.userId}`)
      console.log(`   🎵 Audio File Name: ${sessionRecord.audioFileName}`)
      
      // Prima verifichiamo se il file esiste
      console.log(`🔍 VERIFICA ESISTENZA FILE...`)
      const { data: listData, error: listError } = await supabaseAdmin.storage
        .from('talksfromtherapy')
        .list(sessionRecord.userId, {
          limit: 100,
          search: sessionRecord.audioFileName
        })
      
      console.log(`📋 RISULTATO VERIFICA:`)
      console.log(`   ❌ List Error:`, listError)
      console.log(`   📊 Files found:`, listData?.length || 0)
      if (listData && listData.length > 0) {
        console.log(`   📄 File details:`, listData[0])
      }
      
      if (listError) {
        throw new Error(`Errore nella verifica esistenza file: ${JSON.stringify(listError)}`)
      }
      
      if (!listData || listData.length === 0) {
        throw new Error(`File non trovato nel bucket. Path cercato: ${filePath}`)
      }
      
      console.log(`✅ File trovato! Procedo con il download...`)
      
      // Scarica il file da Supabase Storage
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('talksfromtherapy')
        .download(filePath)

      console.log(`📥 RISULTATO DOWNLOAD:`)
      console.log(`   ❌ Download Error:`, downloadError)
      console.log(`   📄 File Data:`, fileData ? `Blob (${fileData.size} bytes)` : 'null')

      if (downloadError || !fileData) {
        throw new Error(`Errore download file da Supabase Storage: ${JSON.stringify(downloadError)}`)
      }
      
      console.log(`✅ File scaricato con successo, dimensione: ${fileData.size} bytes (${(fileData.size / 1024 / 1024).toFixed(2)} MB)`)
      
      // Converte il blob in buffer per OpenAI
      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Step 1: Utilizza OpenAI Whisper per la trascrizione iniziale
      console.log(`📝 Step 1: Trascrizione iniziale con Whisper...`)
      const initialTranscript = await transcribeAudio(buffer, sessionRecord.audioFileName)
      
      console.log(`📝 Trascrizione iniziale ricevuta: "${initialTranscript.substring(0, 100)}..."`)
      console.log(`📏 Lunghezza trascrizione iniziale: ${initialTranscript.length} caratteri`)
      
      // Verifica se la trascrizione sembra valida
      if (initialTranscript.length < 10 || initialTranscript.includes("Sottotitoli e revisione a cura di")) {
        console.warn(`⚠️ Trascrizione sospetta: "${initialTranscript}"`)
        console.warn(`💡 Potrebbe essere un watermark, file vuoto o audio di bassa qualità`)
      }
      
      // Step 2: Diarizzazione con GPT-3.5-turbo (con fallback)
      console.log(`🎭 Step 2: Avvio diarizzazione con GPT-3.5-turbo...`)
      let finalTranscript = initialTranscript // Fallback alla trascrizione base
      
      try {
        const diarizedTranscript = await diarizeTranscript(initialTranscript, sessionRecord.title)
        finalTranscript = diarizedTranscript
        console.log(`🎭 Diarizzazione completata: "${diarizedTranscript.substring(0, 100)}..."`)
        console.log(`📏 Lunghezza trascrizione diarizzata: ${diarizedTranscript.length} caratteri`)
      } catch (diarizeError) {
        console.warn(`⚠️ Diarizzazione fallita, usando trascrizione base:`, diarizeError)
        console.log(`📝 Salvando trascrizione senza diarizzazione`)
      }
      
      // Aggiorna la sessione con la trascrizione completata su Supabase
      const { error: finalUpdateError } = await supabaseAdmin
        .from('sessions')
        .update({
          status: "TRANSCRIBED",
          transcript: finalTranscript,
          updatedAt: new Date()
        })
        .eq('id', sessionId)

      if (finalUpdateError) {
        console.error('[Supabase] Error updating session with transcript:', finalUpdateError)
        throw new Error('Errore nel salvataggio della trascrizione su Supabase')
      }

      console.log(`✅ Processo completo (trascrizione${finalTranscript === initialTranscript ? '' : ' + diarizzazione'}) completato per sessione ${sessionId}`)

      // Genera automaticamente il riassunto dopo la diarizzazione
      try {
        console.log(`📝 Avvio generazione riassunto automatico per sessione: ${sessionRecord.title}`)
        
        // Split the diarized transcript into chunks
        const chunks = splitTranscriptIntoChunks(finalTranscript)
        console.log(`📝 Diviso il diarizzato in ${chunks.length} chunk(s)`)

        const summaries: string[] = []
        for (let i = 0; i < chunks.length; i++) {
          console.log(`📝 Generazione riassunto per chunk ${i + 1}/${chunks.length}`)
          const summary = await generateChunkSummary(chunks[i])
          summaries.push(summary)
          console.log(`📝 Riassunto chunk ${i + 1} generato: ${summary.length} caratteri`)
        }

        const finalSummary = await combineSummaries(summaries)
        console.log(`✅ Riassunto finale generato: ${finalSummary.length} caratteri`)

        // Save the summary to the analyses table
        const encryptedSummary = await encryptIfSensitive(finalSummary)
        const { error: summaryUpdateError } = await supabaseAdmin
          .from('analyses')
          .upsert({ 
            sessionId: sessionId,
            patientId: sessionRecord.patientId,
            summary: encryptedSummary,
            updatedAt: new Date().toISOString()
          }, {
            onConflict: 'sessionId'
          })

        if (summaryUpdateError) {
          console.warn(`⚠️ Errore nel salvataggio del riassunto:`, summaryUpdateError)
        } else {
          console.log(`✅ Riassunto salvato nel database per sessione ${sessionId}`)
        }

      } catch (summaryError) {
        console.warn(`⚠️ Errore nella generazione automatica del riassunto:`, summaryError)
      }

      return NextResponse.json({
        message: `Trascrizione${finalTranscript === initialTranscript ? '' : ' e diarizzazione'} completate con successo`,
        sessionId,
        status: "TRANSCRIBED",
        transcript: finalTranscript,
        initialTranscriptLength: initialTranscript.length,
        finalTranscriptLength: finalTranscript.length,
        fileSize: fileData.size,
        fileName: sessionRecord.audioFileName,
        diarizationSuccessful: finalTranscript !== initialTranscript
      })

    } catch (error) {
      console.error("❌ Errore durante la trascrizione:", error)
      
      // In caso di errore, aggiorna lo stato a ERROR su Supabase
      const { error: errorUpdateError } = await supabaseAdmin
        .from('sessions')
        .update({
          status: "ERROR",
          errorMessage: error instanceof Error ? error.message : "Errore sconosciuto",
          updatedAt: new Date()
        })
        .eq('id', sessionId)

      if (errorUpdateError) {
        console.error('[Supabase] Error updating session status to ERROR:', errorUpdateError)
      }

      return NextResponse.json({
        error: "Errore durante la trascrizione",
        details: error instanceof Error ? error.message : "Errore sconosciuto"
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Errore durante l'avvio trascrizione:", error)
    console.error("Stack trace:", error instanceof Error ? error.stack : "N/A")
    return NextResponse.json(
      { 
        error: "Errore interno del server",
        details: error instanceof Error ? error.message : "Errore sconosciuto",
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    )
  }
}
