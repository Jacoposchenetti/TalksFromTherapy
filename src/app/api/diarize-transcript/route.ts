import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, createErrorResponse, createSuccessResponse, sanitizeInput, hasResourceAccess } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"
import { diarizeTranscript } from "@/lib/openai"
import { encryptIfSensitive, decryptIfEncrypted } from "@/lib/encryption"
import { openai } from "@/lib/openai"

export const runtime = 'nodejs'

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
          - Crea una narrazione fluida e logica
          - Mantieni TUTTE le informazioni dai riassunti parziali
          - Non aggiungere informazioni non presenti nei riassunti originali
          - Organizza le informazioni in modo cronologico e tematico
          - Elimina eventuali ripetizioni
          - Mantieni il focus sui contenuti terapeutici e relazionali
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

// POST /api/diarize-transcript - Diarizza una trascrizione esistente
export async function POST(request: NextRequest) {
  try {
    // Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }
    
    console.log("POST /api/diarize-transcript - Inizio richiesta", { 
      userId: authResult.user!.id 
    })

    const body = await request.json()
    const { sessionId } = body

    // Validazione input rigorosa
    if (!validateApiInput(body, ['sessionId'])) {
      return createErrorResponse("ID sessione richiesto", 400)
    }

    const sanitizedSessionId = sanitizeInput(sessionId)
    console.log("Dati ricevuti:", { sessionId: sanitizedSessionId })

    console.log(`🔍 Ricerca sessione con ID: ${sanitizedSessionId}`)
    console.log(`👤 User ID: ${authResult.user!.id}`)

    const { data: sessionRecord, error } = await supabase
      .from('sessions')
      .select('id, userId, status, title, transcript, patientId')
      .eq('id', sanitizedSessionId)
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)
      .single()

    console.log("Query database completata", { 
      found: !!sessionRecord, 
      sessionId: sanitizedSessionId,
      status: sessionRecord?.status,
      hasTranscript: !!sessionRecord?.transcript,
      error: error?.message
    })

    if (error || !sessionRecord) {
      console.log(`❌ Sessione non trovata`, { error: error?.message })
      return createErrorResponse("Sessione non trovata", 404)
    }

    // Verifica accesso alla risorsa
    if (!hasResourceAccess(authResult.user!.id, sessionRecord.userId)) {
      return createErrorResponse("Accesso negato a questa risorsa", 403)
    }

    if (!sessionRecord.transcript || sessionRecord.transcript.trim().length === 0) {
      console.log(`❌ Nessuna trascrizione trovata per la sessione`)
      return createErrorResponse("Nessuna trascrizione trovata per questa sessione", 400)
    }

    // Decripta il transcript se è criptato
    const decryptedTranscript = decryptIfEncrypted(sessionRecord.transcript)
    
    if (!decryptedTranscript || decryptedTranscript.trim().length === 0) {
      console.log(`❌ Nessuna trascrizione valida trovata per la sessione`)
      return createErrorResponse("Nessuna trascrizione valida trovata per questa sessione", 400)
    }

    console.log(`✅ Sessione trovata:`, {
      id: sessionRecord.id,
      title: sessionRecord.title,
      status: sessionRecord.status,
      transcriptLength: decryptedTranscript.length
    })

    try {
      console.log(`🎭 Avvio diarizzazione per sessione: ${sessionRecord.title}`)
      
      // Esegui la diarizzazione
      const diarizedTranscript = await diarizeTranscript(decryptedTranscript, sessionRecord.title)
      
      console.log(`🎭 Diarizzazione completata: "${diarizedTranscript.substring(0, 100)}..."`)
      console.log(`📏 Lunghezza trascrizione diarizzata: ${diarizedTranscript.length} caratteri`)
      
      // Aggiorna la sessione con la trascrizione diarizzata criptata
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ 
          transcript: encryptIfSensitive(diarizedTranscript),
          updatedAt: new Date().toISOString()
        })
        .eq('id', sanitizedSessionId)
        .eq('userId', authResult.user!.id) // Double check per sicurezza

      if (updateError) {
        console.error("❌ Errore durante l'aggiornamento della sessione:", updateError)
        return createErrorResponse("Errore durante l'aggiornamento sessione", 500)
      }

      console.log(`✅ Diarizzazione completata per sessione ${sanitizedSessionId}`)

      // Genera automaticamente il riassunto dopo la diarizzazione
      try {
        console.log(`📝 Avvio generazione riassunto automatico per sessione: ${sessionRecord.title}`)
        
        // Split the diarized transcript into chunks
        const chunks = splitTranscriptIntoChunks(diarizedTranscript)
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
        const { error: summaryUpdateError } = await supabase
          .from('analyses')
          .upsert({ 
            sessionId: sanitizedSessionId,
            patientId: sessionRecord.patientId,
            summary: encryptedSummary,
            updatedAt: new Date().toISOString()
          }, {
            onConflict: 'sessionId'
          })

        if (summaryUpdateError) {
          console.warn(`⚠️ Errore nel salvataggio del riassunto:`, summaryUpdateError)
        } else {
          console.log(`✅ Riassunto salvato nel database per sessione ${sanitizedSessionId}`)
        }

      } catch (summaryError) {
        console.warn(`⚠️ Errore nella generazione automatica del riassunto:`, summaryError)
      }

      return createSuccessResponse({
        sessionId: sanitizedSessionId,
        originalTranscriptLength: decryptedTranscript.length,
        diarizedTranscriptLength: diarizedTranscript.length,
        transcript: diarizedTranscript
      }, "Diarizzazione completata con successo")

    } catch (error) {
      console.error("❌ Errore durante la diarizzazione:", error)
      return createErrorResponse("Errore durante la diarizzazione", 500)
    }
  } catch (error) {
    console.error("Errore durante l'avvio diarizzazione:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}