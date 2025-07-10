import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, createErrorResponse, createSuccessResponse, sanitizeInput, hasResourceAccess } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"
import { diarizeTranscript } from "@/lib/openai"

export const runtime = 'nodejs'

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
      .select('id, userId, status, title, transcript')
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

    console.log(`✅ Sessione trovata:`, {
      id: sessionRecord.id,
      title: sessionRecord.title,
      status: sessionRecord.status,
      transcriptLength: sessionRecord.transcript.length
    })

    try {
      console.log(`🎭 Avvio diarizzazione per sessione: ${sessionRecord.title}`)
      
      // Esegui la diarizzazione
      const diarizedTranscript = await diarizeTranscript(sessionRecord.transcript, sessionRecord.title)
      
      console.log(`🎭 Diarizzazione completata: "${diarizedTranscript.substring(0, 100)}..."`)
      console.log(`📏 Lunghezza trascrizione diarizzata: ${diarizedTranscript.length} caratteri`)
      
      // Aggiorna la sessione con la trascrizione diarizzata
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ 
          transcript: diarizedTranscript,
          updatedAt: new Date().toISOString()
        })
        .eq('id', sanitizedSessionId)
        .eq('userId', authResult.user!.id) // Double check per sicurezza

      if (updateError) {
        console.error("❌ Errore durante l'aggiornamento della sessione:", updateError)
        return createErrorResponse("Errore durante l'aggiornamento sessione", 500)
      }

      console.log(`✅ Diarizzazione completata per sessione ${sanitizedSessionId}`)

      return createSuccessResponse({
        sessionId: sanitizedSessionId,
        originalTranscriptLength: sessionRecord.transcript.length,
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