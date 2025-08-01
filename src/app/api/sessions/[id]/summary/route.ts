import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { openai } from "@/lib/openai"
import { verifyApiAuth, createErrorResponse, createSuccessResponse, sanitizeInput, hasResourceAccess } from "@/lib/auth-utils"
import { decryptIfEncrypted, encryptIfSensitive } from "@/lib/encryption"

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    const sessionId = sanitizeInput(params.id)
    console.log(`🔍 Generating summary for session: ${sessionId}`)

    // Fetch session transcript
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('transcript, title, userId')
      .eq('id', sessionId)
      .eq('userId', authResult.user!.id)
      .single()

    if (sessionError || !session) {
      return createErrorResponse("Session not found", 404)
    }

    // Verifica accesso alla risorsa
    if (!hasResourceAccess(authResult.user!.id, session.userId)) {
      return createErrorResponse("Accesso negato a questa risorsa", 403)
    }

    if (!session.transcript || session.transcript.trim().length === 0) {
      return createErrorResponse("No transcript available", 400)
    }

    console.log(`🔍 Transcript length: ${session.transcript.length} characters`)

    // Decrypt transcript if it's encrypted
    const decryptedTranscript = await decryptIfEncrypted(session.transcript)
    console.log(`🔍 Decrypted transcript length: ${decryptedTranscript.length} characters`)

    // Split transcript into chunks
    const chunks = splitTranscriptIntoChunks(decryptedTranscript)
    console.log(`🔍 Split into ${chunks.length} chunks`)

    // Generate summaries for each chunk
    const chunkSummaries: string[] = []
    for (let i = 0; i < chunks.length; i++) {
      console.log(`🔍 Generating summary for chunk ${i + 1}/${chunks.length}`)
      const summary = await generateChunkSummary(chunks[i])
      chunkSummaries.push(summary)
    }

    // Combine summaries if there are multiple chunks
    let finalSummary = ""
    if (chunkSummaries.length > 1) {
      console.log(`🔍 Combining ${chunkSummaries.length} summaries`)
      finalSummary = await combineSummaries(chunkSummaries)
    } else {
      finalSummary = chunkSummaries[0]
    }

    console.log(`🔍 Final summary length: ${finalSummary.length} characters`)

    // Encrypt summary if it's sensitive
    const encryptedSummary = await encryptIfSensitive(finalSummary)

    // Save summary to database
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ 
        summary: encryptedSummary,
        updatedAt: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('userId', authResult.user!.id)

    if (updateError) {
      console.error("Error saving summary:", updateError)
      return createErrorResponse("Failed to save summary", 500)
    }

    console.log(`🔍 Summary saved successfully for session: ${sessionId}`)

    return createSuccessResponse({
      sessionId,
      summary: finalSummary,
      chunksProcessed: chunks.length
    })

  } catch (error) {
    console.error("Error generating summary:", error)
    return createErrorResponse("Internal server error", 500)
  }
} 

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    const sessionId = sanitizeInput(params.id)

    // Fetch session summary
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('summary, title, userId')
      .eq('id', sessionId)
      .eq('userId', authResult.user!.id)
      .single()

    if (sessionError || !session) {
      return createErrorResponse("Session not found", 404)
    }

    // Verifica accesso alla risorsa
    if (!hasResourceAccess(authResult.user!.id, session.userId)) {
      return createErrorResponse("Accesso negato a questa risorsa", 403)
    }

    const hasSummary = session.summary && session.summary.trim().length > 0

    return createSuccessResponse({
      sessionId,
      hasSummary,
      summary: hasSummary ? decryptIfEncrypted(session.summary) : null
    })

  } catch (error) {
    console.error("Error checking summary:", error)
    return createErrorResponse("Internal server error", 500)
  }
} 