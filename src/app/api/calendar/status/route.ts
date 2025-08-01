import { NextRequest } from "next/server"
import { verifyApiAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { GoogleCalendarService } from "@/lib/google-calendar"

/**
 * 🔍 GET /api/calendar/status
 * Verifica se l'utente ha una connessione Google Calendar attiva
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse("Non autorizzato", 401)
    }

    const googleCalendarService = new GoogleCalendarService()
    const integration = await googleCalendarService.getIntegration(authResult.user!.id)

    if (!integration) {
      return createSuccessResponse({
        connected: false,
        message: "Nessuna integrazione Google Calendar trovata"
      })
    }

    // Verifica se i token sono ancora validi
    try {
      const validIntegration = await googleCalendarService.ensureValidToken(integration)
      
      return createSuccessResponse({
        connected: true,
        calendarName: integration.calendar_name,
        googleUserId: integration.google_user_id,
        lastSync: integration.updated_at,
        message: "Integrazione Google Calendar attiva"
      })
    } catch (tokenError) {
      // Se i token sono scaduti e non rinnovabili, rimuovi l'integrazione
      await googleCalendarService.removeIntegration(authResult.user!.id)
      
      return createSuccessResponse({
        connected: false,
        message: "Integrazione scaduta, riconnessione necessaria"
      })
    }
  } catch (error) {
    console.error('Calendar status error:', error)
    return createErrorResponse("Errore nel controllo dello stato del calendario", 500)
  }
}

/**
 * 🗑️ DELETE /api/calendar/status
 * Disconnette l'integrazione Google Calendar
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse("Non autorizzato", 401)
    }

    const googleCalendarService = new GoogleCalendarService()
    await googleCalendarService.removeIntegration(authResult.user!.id)

    return createSuccessResponse({
      message: "Integrazione Google Calendar rimossa con successo"
    })
  } catch (error) {
    console.error('Calendar disconnect error:', error)
    return createErrorResponse("Errore nella disconnessione del calendario", 500)
  }
}
