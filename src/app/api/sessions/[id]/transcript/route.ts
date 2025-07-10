import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, createErrorResponse, createSuccessResponse, sanitizeInput, hasResourceAccess } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"

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

    // SECURITY: Prima verifichiamo che la sessione appartenga all'utente
    const { data: sessionData, error } = await supabase
      .from('sessions')
      .select(`
        id,
        transcript,
        userId,
        patients!inner (
          id,
          initials,
          userId
        )
      `)
      .eq('id', sessionId)
      .eq('userId', authResult.user!.id) // CRITICAL: Verifica ownership
      .eq('isActive', true)
      .single()

    if (error || !sessionData) {
      return createErrorResponse("Sessione non trovata", 404)
    }

    // Double check: Verifica accesso alla risorsa
    if (!hasResourceAccess(authResult.user!.id, sessionData.userId)) {
      return createErrorResponse("Accesso negato a questa risorsa", 403)
    }

    // Verifica che anche il paziente appartenga all'utente (se esiste)
    if (sessionData.patients && sessionData.patients.length > 0) {
      const patient = sessionData.patients[0]
      if (patient.userId && !hasResourceAccess(authResult.user!.id, patient.userId)) {
        return createErrorResponse("Accesso negato al paziente", 403)
      }
    }

    return createSuccessResponse(sessionData)
  } catch (error) {
    console.error("Error fetching session transcript:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}