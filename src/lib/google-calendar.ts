import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * 🗓️ GOOGLE CALENDAR SERVICE
 * Gestisce l'integrazione con Google Calendar API
 */
export class GoogleCalendarService {
  private oauth2Client

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google-calendar/callback`
    )
  }

  /**
   * 🔗 Genera URL di autorizzazione Google
   */
  getAuthUrl(state?: string) {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Forza il refresh token
      state: state // Per passare l'user ID
    })
  }

  /**
   * 🔑 Scambia authorization code per access/refresh tokens
   */
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getAccessToken(code)
    return tokens
  }

  /**
   * 🔄 Refresh access token usando refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken
    })
    
    const { credentials } = await this.oauth2Client.refreshAccessToken()
    return credentials
  }

  /**
   * 📅 Ottieni eventi dal calendario
   */
  async getCalendarEvents(
    accessToken: string, 
    options: {
      timeMin?: string
      timeMax?: string
      maxResults?: number
      calendarId?: string
    } = {}
  ) {
    this.oauth2Client.setCredentials({ access_token: accessToken })
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })

    const {
      timeMin = new Date().toISOString(),
      timeMax,
      maxResults = 50,
      calendarId = 'primary'
    } = options

    try {
      const response = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      })

      return response.data.items || []
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      throw new Error('Errore nel recupero degli eventi calendario')
    }
  }

  /**
   * ➕ Crea nuovo evento nel calendario
   */
  async createEvent(accessToken: string, eventData: any, calendarId = 'primary') {
    this.oauth2Client.setCredentials({ access_token: accessToken })
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })

    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: eventData
      })

      return response.data
    } catch (error) {
      console.error('Error creating calendar event:', error)
      throw new Error('Errore nella creazione dell\'evento')
    }
  }

  /**
   * ✏️ Aggiorna evento esistente
   */
  async updateEvent(
    accessToken: string, 
    eventId: string, 
    eventData: any, 
    calendarId = 'primary'
  ) {
    this.oauth2Client.setCredentials({ access_token: accessToken })
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })

    try {
      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: eventData
      })

      return response.data
    } catch (error) {
      console.error('Error updating calendar event:', error)
      throw new Error('Errore nell\'aggiornamento dell\'evento')
    }
  }

  /**
   * 🗑️ Elimina evento dal calendario
   */
  async deleteEvent(accessToken: string, eventId: string, calendarId = 'primary') {
    this.oauth2Client.setCredentials({ access_token: accessToken })
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })

    try {
      await calendar.events.delete({
        calendarId,
        eventId
      })

      return true
    } catch (error) {
      console.error('Error deleting calendar event:', error)
      throw new Error('Errore nell\'eliminazione dell\'evento')
    }
  }

  /**
   * 📋 Ottieni lista dei calendari dell'utente
   */
  async getCalendarList(accessToken: string) {
    this.oauth2Client.setCredentials({ access_token: accessToken })
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })

    try {
      const response = await calendar.calendarList.list()
      return response.data.items || []
    } catch (error) {
      console.error('Error fetching calendar list:', error)
      throw new Error('Errore nel recupero della lista calendari')
    }
  }

  /**
   * 👤 Ottieni informazioni profilo utente Google
   */
  async getUserInfo(accessToken: string) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 
          Authorization: `Bearer ${accessToken}` 
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user info')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching user info:', error)
      throw new Error('Errore nel recupero informazioni utente')
    }
  }

  /**
   * 💾 Salva integrazione nel database
   */
  async saveIntegration(userId: string, tokens: any, googleUser: any) {
    try {
      console.log('💾 Saving integration - User:', userId, 'Google User:', googleUser.id)
      
      const integrationData = {
        user_id: userId,
        google_user_id: googleUser.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + (tokens.expiry_date || 3600000)),
        calendar_name: googleUser.email,
        sync_enabled: true,
        updated_at: new Date().toISOString()
      }
      
      console.log('📋 Integration data:', {
        user_id: integrationData.user_id,
        google_user_id: integrationData.google_user_id,
        calendar_name: integrationData.calendar_name,
        has_access_token: !!integrationData.access_token,
        has_refresh_token: !!integrationData.refresh_token,
        token_expires_at: integrationData.token_expires_at
      })

      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .upsert(integrationData)
        .select()

      if (error) {
        console.error('❌ Database save error:', error)
        throw new Error('Errore nel salvataggio integrazione')
      }

      console.log('✅ Integration saved successfully:', data?.[0]?.id)
      return data?.[0]
    } catch (error) {
      console.error('❌ Error saving integration:', error)
      throw error
    }
  }

  /**
   * 🔍 Ottieni integrazione dal database
   */
  async getIntegration(userId: string) {
    try {
      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('sync_enabled', true)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Database fetch error:', error)
        throw new Error('Errore nel recupero integrazione')
      }

      return data
    } catch (error) {
      console.error('Error fetching integration:', error)
      throw error
    }
  }

  /**
   * 🔄 Aggiorna token se scaduto
   */
  async ensureValidToken(integration: any) {
    const now = new Date()
    const expiresAt = new Date(integration.token_expires_at)

    // Se il token scade tra meno di 5 minuti, rinnovalo
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      if (!integration.refresh_token) {
        throw new Error('Token scaduto e nessun refresh token disponibile')
      }

      try {
        const newTokens = await this.refreshAccessToken(integration.refresh_token)
        
        // Aggiorna nel database
        const { error } = await supabase
          .from('google_calendar_integrations')
          .update({
            access_token: newTokens.access_token,
            token_expires_at: new Date(Date.now() + (newTokens.expiry_date || 3600000)),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', integration.user_id)

        if (error) {
          console.error('Error updating tokens:', error)
          throw new Error('Errore nell\'aggiornamento dei token')
        }

        // Restituisci l'integrazione aggiornata
        return {
          ...integration,
          access_token: newTokens.access_token,
          token_expires_at: new Date(Date.now() + (newTokens.expiry_date || 3600000))
        }
      } catch (error) {
        console.error('Error refreshing token:', error)
        throw new Error('Errore nel rinnovo del token')
      }
    }

    return integration
  }

  /**
   * 🗑️ Rimuovi integrazione
   */
  async removeIntegration(userId: string) {
    try {
      const { error } = await supabase
        .from('google_calendar_integrations')
        .update({ sync_enabled: false })
        .eq('user_id', userId)

      if (error) {
        console.error('Error removing integration:', error)
        throw new Error('Errore nella rimozione integrazione')
      }

      return true
    } catch (error) {
      console.error('Error removing integration:', error)
      throw error
    }
  }
}
