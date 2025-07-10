import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, createErrorResponse, createSuccessResponse, sanitizeInput, hasResourceAccess } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"
import { encryptIfSensitive, decryptIfEncrypted } from "@/lib/encryption"

export const runtime = 'nodejs'

// GET /api/sessions/[id]/note - Get note for a session
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

    const sessionId = sanitizeInput(params.id)

    // Verify session belongs to user
    const { data: sessionRecord, error: sessionError } = await supabase
      .from('sessions')
      .select('id, userId')
      .eq('id', sessionId)
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)
      .single()

    if (sessionError || !sessionRecord) {
      return createErrorResponse("Sessione non trovata", 404)
    }

    // Double check accesso alla risorsa
    if (!hasResourceAccess(authResult.user!.id, sessionRecord.userId)) {
      return createErrorResponse("Accesso negato a questa risorsa", 403)
    }

    // Find existing note
    const { data: note } = await supabase
      .from('session_notes')
      .select('*')
      .eq('sessionId', sessionId)
      .single()

    // Decripta il contenuto della nota se è criptato
    const decryptedContent = note?.content ? decryptIfEncrypted(note.content) : ""

    const noteData = {
      id: note?.id,
      content: decryptedContent,
      sessionId: sessionId,
      createdAt: note?.createdAt,
      updatedAt: note?.updatedAt,
    }

    return createSuccessResponse(noteData)
  } catch (error) {
    console.error("Error fetching session note:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}

// POST /api/sessions/[id]/note - Create or update note for a session
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

    // Validazione parametri
    if (!params.id || typeof params.id !== 'string') {
      return createErrorResponse("ID sessione non valido", 400)
    }

    const sessionIdForPost = sanitizeInput(params.id)
    const body = await request.json()
    const { content } = body

    // Validazione input
    if (!validateApiInput(body, ['content'])) {
      return createErrorResponse("Content è richiesto", 400)
    }

    if (typeof content !== 'string') {
      return createErrorResponse("Content deve essere una stringa", 400)
    }

    const sanitizedContent = sanitizeInput(content)
    
    // Cripta il contenuto se sensibile
    const encryptedContent = encryptIfSensitive(sanitizedContent)

    // Verify session belongs to user
    const { data: sessionRecord, error: sessionError } = await supabase
      .from('sessions')
      .select('id, userId')
      .eq('id', sessionIdForPost)
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)
      .single()

    if (sessionError || !sessionRecord) {
      return createErrorResponse("Sessione non trovata", 404)
    }

    // Double check accesso alla risorsa
    if (!hasResourceAccess(authResult.user!.id, sessionRecord.userId)) {
      return createErrorResponse("Accesso negato a questa risorsa", 403)
    }

    // Upsert note con sicurezza
    const { data: note, error: noteError } = await supabase
      .from('session_notes')
      .upsert({
        sessionId: sessionIdForPost,
        content: encryptedContent,
        updatedAt: new Date().toISOString(),
      }, {
        onConflict: 'sessionId'
      })
      .select()
      .single()

    if (noteError) {
      console.error('Errore salvataggio nota:', noteError)
      return createErrorResponse("Errore durante il salvataggio nota", 500)
    }

    // Decripta il contenuto per la risposta
    const decryptedContent = decryptIfEncrypted(note.content)

    return createSuccessResponse({
      id: note.id,
      content: decryptedContent,
      sessionId: note.sessionId,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }, "Nota salvata con successo")
  } catch (error) {
    console.error("Error saving session note:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}
