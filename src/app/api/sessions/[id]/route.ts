import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, createErrorResponse, createSuccessResponse, sanitizeInput, hasResourceAccess } from "@/lib/auth-utils"
import { createClient } from "@supabase/supabase-js"
import { encryptIfSensitive, decryptIfEncrypted } from "@/lib/encryption"

// Client Supabase con service role per operazioni RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    // Validazione parametri
    if (!params.id || typeof params.id !== 'string') {
      return createErrorResponse("ID sessione non valido", 400)
    }

    const sessionId = sanitizeInput(params.id)

    // Trova la sessione e verifica ownership
    const { data: sessionToDelete, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, audioFileName, userId')
      .eq('id', sessionId)
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)
      .single()

    if (sessionError || !sessionToDelete) {
      return createErrorResponse("Sessione non trovata", 404)
    }

    // Verifica accesso alla risorsa
    if (!hasResourceAccess(authResult.user!.id, sessionToDelete.userId)) {
      return createErrorResponse("Accesso negato a questa risorsa", 403)
    }

    // Elimina il file audio da Supabase Storage se esiste
    if (sessionToDelete.audioFileName) {
      try {
        const filePath = `${authResult.user!.id}/${sessionToDelete.audioFileName}`
        const { error: deleteError } = await supabaseAdmin.storage
          .from('talksfromtherapy')
          .remove([filePath])
        
        if (deleteError) {
          console.warn("Could not delete audio file from storage:", deleteError)
          // Continua con l'eliminazione dal database anche se il file non può essere eliminato
        }
      } catch (fileError) {
        console.warn("Error deleting audio file:", fileError)
      }
    }

    // Soft delete della sessione (imposta isActive a false)
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ isActive: false })
      .eq('id', sessionId)
      .eq('userId', authResult.user!.id) // Double check per sicurezza

    if (updateError) {
      console.error('Errore eliminazione sessione:', updateError)
      return createErrorResponse("Errore durante l'eliminazione sessione", 500)
    }

    return createSuccessResponse(null, "Sessione eliminata con successo")
  } catch (error) {
    console.error("Error deleting session:", error)
    return createErrorResponse("Errore interno del server", 500)
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

    // Validazione parametri
    if (!params.id || typeof params.id !== 'string') {
      return createErrorResponse("ID sessione non valido", 400)
    }

    const sessionIdForGet = sanitizeInput(params.id)

    // Cerca la sessione con i dati del paziente
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*, patient:patients(*)')
      .eq('id', sessionIdForGet)
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)
      .single()

    if (sessionError || !sessionData) {
      return createErrorResponse("Sessione non trovata", 404)
    }

    // Decripta il transcript se presente
    const decryptedSessionData = {
      ...sessionData,
      transcript: decryptIfEncrypted(sessionData.transcript)
    }

    return createSuccessResponse(decryptedSessionData)
  } catch (error) {
    console.error("Error fetching session:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    // Validazione parametri
    if (!params.id || typeof params.id !== 'string') {
      return createErrorResponse("ID sessione non valido", 400)
    }

    const sessionIdForPatch = sanitizeInput(params.id)
    const body = await request.json()
    const { title, transcript } = body

    // Validate input - either title or transcript (or both) should be provided
    if (!title && !transcript) {
      return createErrorResponse("Title o transcript devono essere forniti", 400)
    }

    // Validate title if provided
    if (title !== undefined) {
      const sanitizedTitle = sanitizeInput(title)
      if (typeof sanitizedTitle !== 'string' || sanitizedTitle.trim().length === 0) {
        return createErrorResponse("Il titolo deve essere una stringa non vuota", 400)
      }

      if (sanitizedTitle.trim().length > 255) {
        return createErrorResponse("Il titolo deve essere di meno di 255 caratteri", 400)
      }
    }

    // Validate transcript if provided
    if (transcript !== undefined) {
      const sanitizedTranscript = sanitizeInput(transcript)
      if (typeof sanitizedTranscript !== 'string') {
        return createErrorResponse("Il transcript deve essere una stringa", 400)
      }

      if (sanitizedTranscript.trim().length === 0) {
        return createErrorResponse("Il transcript non può essere vuoto", 400)
      }
    }

    // Verify session exists and user owns it
    const { data: existingSession, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, userId')
      .eq('id', sessionIdForPatch)
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)
      .single()

    if (sessionError || !existingSession) {
      return createErrorResponse("Sessione non trovata", 404)
    }

    // Verifica accesso alla risorsa
    if (!hasResourceAccess(authResult.user!.id, existingSession.userId)) {
      return createErrorResponse("Accesso negato a questa risorsa", 403)
    }

    // Update the session with provided fields
    const updateData: any = { updatedAt: new Date().toISOString() }
    
    if (title !== undefined) {
      updateData.title = sanitizeInput(title).trim()
    }
    
    if (transcript !== undefined) {
      updateData.transcript = encryptIfSensitive(sanitizeInput(transcript).trim())
    }

    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update(updateData)
      .eq('id', sessionIdForPatch)
      .eq('userId', authResult.user!.id) // Double check per sicurezza
      .select('*, patient:patients(*)')
      .single()

    if (updateError) {
      console.error('Errore aggiornamento sessione:', updateError)
      return createErrorResponse("Errore durante l'aggiornamento sessione", 500)
    }

    // Decripta il transcript per la risposta
    const decryptedSession = {
      ...updatedSession,
      transcript: decryptIfEncrypted(updatedSession.transcript)
    }

    return createSuccessResponse(decryptedSession, "Sessione aggiornata con successo")
  } catch (error) {
    console.error("Error updating session:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}