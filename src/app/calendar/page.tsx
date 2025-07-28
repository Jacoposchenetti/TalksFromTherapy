'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, ExternalLink, RefreshCw, Unlink, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  description?: string
  htmlLink: string
  location?: string
  attendees?: Array<{ email: string; responseStatus: string }>
}

interface CalendarStatus {
  connected: boolean
  calendarName?: string
  googleUserId?: string
  lastSync?: string
}

export default function CalendarPage() {
  const [status, setStatus] = useState<CalendarStatus>({ connected: false })
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    checkConnection()
    handleUrlParams()
  }, [])

  const handleUrlParams = () => {
    const params = new URLSearchParams(window.location.search)
    const successParam = params.get('success')
    const errorParam = params.get('error')
    const email = params.get('email')

    if (successParam === 'true') {
      setSuccess(email ? `Connesso con successo a ${email}` : 'Connesso con successo a Google Calendar')
      // Pulisci URL
      window.history.replaceState({}, '', '/calendar')
      // Ricarica lo status
      setTimeout(() => checkConnection(), 1000)
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        'authorization_denied': 'Autorizzazione negata dall\'utente',
        'no_authorization_code': 'Codice di autorizzazione mancante',
        'auth_failed': 'Errore durante l\'autorizzazione',
        'token_error': 'Errore nel recupero dei token',
        'user_info_error': 'Errore nel recupero delle informazioni utente',
        'save_error': 'Errore nel salvataggio dell\'integrazione nel database'
      }
      setError(errorMessages[errorParam] || 'Errore sconosciuto durante la connessione')
      // Pulisci URL
      window.history.replaceState({}, '', '/calendar')
    }
  }

  const checkConnection = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/calendar/status')
      
      if (!response.ok) {
        throw new Error('Errore nel controllo dello stato')
      }

      const data = await response.json()
      
      if (data.success) {
        setStatus(data.data)
        if (data.data.connected) {
          loadEvents()
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error)
      setError('Errore nel controllo dello stato della connessione')
    } finally {
      setLoading(false)
    }
  }

  const connectToGoogle = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔗 Iniziando connessione a Google Calendar...')
      
      const response = await fetch('/api/auth/google-calendar')
      
      console.log('📡 Risposta dall\'API:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Errore nella risposta:', errorText)
        throw new Error(`Errore nella generazione dell'URL di autorizzazione: ${response.status}`)
      }

      const data = await response.json()
      
      console.log('📄 Dati ricevuti:', data)
      
      if (data.success && data.data.authUrl) {
        console.log('🚀 Reindirizzando a:', data.data.authUrl)
        // Reindirizza a Google per l'autorizzazione
        window.location.href = data.data.authUrl
      } else {
        console.error('❌ URL di autorizzazione mancante:', data)
        throw new Error('URL di autorizzazione non ricevuto')
      }
    } catch (error) {
      console.error('❌ Errore durante la connessione:', error)
      setError(`Errore durante la connessione a Google Calendar: ${error}`)
      setLoading(false)
    }
  }

  const disconnectGoogle = async () => {
    if (!confirm('Sei sicuro di voler disconnettere Google Calendar?')) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/calendar/status', {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Errore nella disconnessione')
      }

      setStatus({ connected: false })
      setEvents([])
      setSuccess('Google Calendar disconnesso con successo')
    } catch (error) {
      console.error('Error disconnecting Google:', error)
      setError('Errore durante la disconnessione')
    } finally {
      setLoading(false)
    }
  }

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Carica eventi della prossima settimana
      const timeMin = new Date().toISOString()
      const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const response = await fetch(
        `/api/calendar/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=20`
      )
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Token scaduto, riconnessione necessaria')
          setStatus({ connected: false })
          return
        }
        throw new Error('Errore nel caricamento degli eventi')
      }

      const data = await response.json()
      
      if (data.success) {
        setEvents(data.data.events)
      }
    } catch (error) {
      console.error('Error loading events:', error)
      setError('Errore nel caricamento degli eventi')
    } finally {
      setLoading(false)
    }
  }

  const formatEventTime = (event: CalendarEvent) => {
    const start = event.start.dateTime || event.start.date
    const end = event.end.dateTime || event.end.date
    
    if (!start) return 'Orario non specificato'
    
    const startDate = new Date(start)
    const endDate = new Date(end!)
    
    const dateOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }
    
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit'
    }
    
    if (event.start.dateTime) {
      // Evento con orario
      const sameDay = startDate.toDateString() === endDate.toDateString()
      
      if (sameDay) {
        return `${startDate.toLocaleDateString('it-IT', dateOptions)} ${startDate.toLocaleTimeString('it-IT', timeOptions)} - ${endDate.toLocaleTimeString('it-IT', timeOptions)}`
      } else {
        return `${startDate.toLocaleDateString('it-IT', dateOptions)} ${startDate.toLocaleTimeString('it-IT', timeOptions)} - ${endDate.toLocaleDateString('it-IT', dateOptions)} ${endDate.toLocaleTimeString('it-IT', timeOptions)}`
      }
    } else {
      // Evento tutto il giorno
      return `${startDate.toLocaleDateString('it-IT', dateOptions)} (tutto il giorno)`
    }
  }

  // Schermata di connessione
  if (!status.connected) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-md mx-auto">
          {/* Alert di errore */}
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Alert di successo */}
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-blue-500" />
              <CardTitle>Connetti Google Calendar</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-6 text-gray-600">
                Sincronizza il tuo Google Calendar per visualizzare i tuoi eventi e sessioni direttamente nella piattaforma.
              </p>
              
              <div className="space-y-4 text-sm text-gray-500 mb-6">
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Visualizza eventi esistenti</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Crea nuovi appuntamenti</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Sincronizzazione automatica</span>
                </div>
              </div>
              
              <Button 
                onClick={connectToGoogle}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Connessione in corso...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connetti con Google
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Schermata principale del calendario
  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Il Mio Calendario</h1>
          <p className="text-gray-600">
            Connesso a: <strong>{status.calendarName}</strong>
          </p>
          {status.lastSync && (
            <p className="text-sm text-gray-500">
              Ultimo aggiornamento: {new Date(status.lastSync).toLocaleString('it-IT')}
            </p>
          )}
        </div>
        <div className="space-x-2">
          <Button 
            onClick={loadEvents}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
          <Button 
            onClick={disconnectGoogle}
            disabled={loading}
            variant="outline"
            className="text-red-600 hover:text-red-700"
          >
            <Unlink className="w-4 h-4 mr-2" />
            Disconnetti
          </Button>
        </div>
      </div>

      {/* Alert di errore */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Alert di successo */}
      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Eventi */}
      <div className="space-y-4">
        {loading && events.length === 0 ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Caricamento eventi...</p>
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-2">Nessun evento nei prossimi 7 giorni</p>
              <p className="text-sm text-gray-500">
                Gli eventi del tuo Google Calendar appariranno qui
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Prossimi Eventi</h2>
              <span className="text-sm text-gray-500">
                {events.length} eventi trovati
              </span>
            </div>
            
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{event.summary}</h3>
                      
                      <div className="flex items-center mb-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        {formatEventTime(event)}
                      </div>

                      {event.location && (
                        <div className="flex items-center mb-2 text-sm text-gray-600">
                          <span className="w-4 h-4 mr-2">📍</span>
                          {event.location}
                        </div>
                      )}

                      {event.description && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {event.description.length > 200 
                              ? `${event.description.substring(0, 200)}...`
                              : event.description
                            }
                          </p>
                        </div>
                      )}

                      {event.attendees && event.attendees.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600 mb-1">
                            Partecipanti ({event.attendees.length}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {event.attendees.slice(0, 3).map((attendee, index) => (
                              <span 
                                key={index}
                                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                              >
                                {attendee.email}
                              </span>
                            ))}
                            {event.attendees.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{event.attendees.length - 3} altri
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <Button variant="outline" size="sm" asChild className="ml-4">
                      <a 
                        href={event.htmlLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="Apri in Google Calendar"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
