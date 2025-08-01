import { NextRequest } from "next/server"
import { verifyApiAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { GoogleCalendarService } from "@/lib/google-calendar"

/**
 * 🔗 GET /api/auth/google-calendar
 * Genera URL di autorizzazione Google Calendar
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse("Non autorizzato", 401)
    }

    const googleCalendarService = new GoogleCalendarService()
    const authUrl = googleCalendarService.getAuthUrl(authResult.user!.id)

    return createSuccessResponse({ 
      authUrl,
      message: "URL di autorizzazione generato con successo" 
    })
  } catch (error) {
    console.error('Google Calendar auth error:', error)
    return createErrorResponse("Errore durante la generazione dell'URL di autorizzazione", 500)
  }
}
