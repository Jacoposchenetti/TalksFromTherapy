import { NextRequest } from "next/server"
import { verifyApiAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { GoogleCalendarService } from "@/lib/google-calendar"

/**
 * 📅 GET /api/calendar/events
 * Recupera gli eventi dal Google Calendar dell'utente
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse("Non autorizzato", 401)
    }

    const { searchParams } = new URL(request.url)
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')
    const maxResults = parseInt(searchParams.get('maxResults') || '50')

    const googleCalendarService = new GoogleCalendarService()
    
    // Ottieni integrazione dell'utente
    const integration = await googleCalendarService.getIntegration(authResult.user!.id)
    
    if (!integration) {
      return createErrorResponse("Google Calendar non configurato", 404)
    }

    // Assicurati che i token siano validi
    const validIntegration = await googleCalendarService.ensureValidToken(integration)

    // Ottieni eventi
    const events = await googleCalendarService.getCalendarEvents(
      validIntegration.access_token,
      {
        timeMin: timeMin || undefined,
        timeMax: timeMax || undefined,
        maxResults
      }
    )

    return createSuccessResponse({
      events,
      calendarName: integration.calendar_name,
      totalEvents: events.length,
      timeRange: {
        from: timeMin || 'now',
        to: timeMax || 'unlimited'
      }
    })
  } catch (error) {
    console.error('Calendar events error:', error)
    
    // Se l'errore è relativo ai token, restituisci un errore specifico
    if (error instanceof Error && error.message.includes('token')) {
      return createErrorResponse("Token Google scaduto, riconnessione necessaria", 401)
    }
    
    return createErrorResponse("Errore nel recupero degli eventi calendario", 500)
  }
}

/**
 * ➕ POST /api/calendar/events
 * Crea un nuovo evento nel Google Calendar
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse("Non autorizzato", 401)
    }

    const eventData = await request.json()
    
    // Validazione base dei dati evento
    if (!eventData.summary || !eventData.start || !eventData.end) {
      return createErrorResponse("Dati evento incompleti (summary, start, end richiesti)", 400)
    }

    const googleCalendarService = new GoogleCalendarService()
    
    // Ottieni integrazione dell'utente
    const integration = await googleCalendarService.getIntegration(authResult.user!.id)
    
    if (!integration) {
      return createErrorResponse("Google Calendar non configurato", 404)
    }

    // Assicurati che i token siano validi
    const validIntegration = await googleCalendarService.ensureValidToken(integration)

    // Crea evento
    const createdEvent = await googleCalendarService.createEvent(
      validIntegration.access_token,
      eventData
    )

    return createSuccessResponse({
      event: createdEvent,
      message: "Evento creato con successo"
    })
  } catch (error) {
    console.error('Create event error:', error)
    
    if (error instanceof Error && error.message.includes('token')) {
      return createErrorResponse("Token Google scaduto, riconnessione necessaria", 401)
    }
    
    return createErrorResponse("Errore nella creazione dell'evento", 500)
  }
}
