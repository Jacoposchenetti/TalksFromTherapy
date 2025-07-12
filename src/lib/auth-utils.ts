import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"
import { authOptions } from "./auth"

/**
 * SISTEMA DI AUTORIZZAZIONE UNIFICATO
 * Centralizza tutte le verifiche di auth per consistenza e sicurezza
 */

export interface AuthUser {
  id: string
  email: string
  role?: string
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
}

/**
 * Verifica l'autorizzazione per le API routes
 * @param req NextRequest object
 * @returns AuthResult con user info se autorizzato
 */
export async function verifyApiAuth(req?: NextRequest): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      // Log failed auth attempt
      if (req) {
        await logSecurityEvent(
          'failed_auth',
          req.ip || req.headers.get('x-forwarded-for') || 'unknown',
          undefined,
          req.nextUrl?.pathname,
          { reason: 'no_session' },
          'medium',
          req
        )
      }
      
      return {
        success: false,
        error: 'Non autorizzato - sessione non valida'
      }
    }

    // Valida che abbiamo i dati essenziali
    if (!session.user.email || !session.user.id) {
      // Log incomplete user data
      if (req) {
        await logSecurityEvent(
          'failed_auth',
          req.ip || req.headers.get('x-forwarded-for') || 'unknown',
          session.user.id,
          req.nextUrl?.pathname,
          { reason: 'incomplete_user_data' },
          'medium',
          req
        )
      }
      
      return {
        success: false,
        error: 'Non autorizzato - dati utente incompleti'
      }
    }

    return {
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: (session.user as any).role || 'user'
      }
    }
  } catch (error) {
    console.error('Errore verifica auth:', error)
    
    // Log auth system error
    if (req) {
      await logSecurityEvent(
        'auth_system_error',
        req.ip || req.headers.get('x-forwarded-for') || 'unknown',
        undefined,
        req.nextUrl?.pathname,
        { error: String(error) },
        'high',
        req
      )
    }
    
    return {
      success: false,
      error: 'Errore interno di autenticazione'
    }
  }
}

/**
 * Middleware helper per validare input API
 * @param data Dati da validare
 * @param schema Schema di validazione (opzionale)
 * @returns boolean
 */
export function validateApiInput(data: any, requiredFields: string[]): boolean {
  if (!data || typeof data !== 'object') {
    return false
  }

  for (const field of requiredFields) {
    if (!data[field] || data[field].toString().trim() === '') {
      return false
    }
  }

  return true
}

/**
 * Sanitizza string input per prevenire injection
 * @param input Input da sanitizzare
 * @returns String sanitizzata
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Rimuove basic XSS
    .substring(0, 1000) // Limita lunghezza
}

/**
 * Valida che l'utente abbia accesso a una risorsa specifica
 * @param userId ID dell'utente corrente
 * @param resourceOwnerId ID del proprietario della risorsa
 * @param userRole Ruolo dell'utente (opzionale)
 * @returns boolean
 */
export function hasResourceAccess(
  userId: string, 
  resourceOwnerId: string, 
  userRole?: string
): boolean {
  // L'utente può accedere alle proprie risorse
  if (userId === resourceOwnerId) {
    return true
  }
  
  // Gli admin possono accedere a tutto (se implementato)
  if (userRole === 'admin') {
    return true
  }
  
  return false
}

/**
 * Crea una response di errore standardizzata
 * @param message Messaggio di errore
 * @param status HTTP status code
 * @returns Response object
 */
export function createErrorResponse(message: string, status: number = 400, extraData?: any) {
  return new Response(
    JSON.stringify({ 
      error: message,
      timestamp: new Date().toISOString(),
      ...extraData
    }), 
    { 
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    }
  )
}

/**
 * Crea una response di successo standardizzata
 * @param data Dati da restituire
 * @param message Messaggio opzionale
 * @returns Response object
 */
export function createSuccessResponse(data: any, message?: string) {
  return new Response(
    JSON.stringify({ 
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    }), 
    { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    }
  )
}

/**
 * Logga eventi di sicurezza nel database
 * @param eventType Tipo di evento
 * @param identifier IP o user ID
 * @param userId ID utente (opzionale)
 * @param endpoint Endpoint coinvolto
 * @param details Dettagli aggiuntivi
 * @param severity Gravità dell'evento
 * @param req Request object per IP e user agent
 */
export async function logSecurityEvent(
  eventType: string,
  identifier: string,
  userId?: string,
  endpoint?: string,
  details?: any,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  req?: NextRequest
) {
  try {
    const { supabase } = await import("@/lib/supabase")
    
    await supabase.from('security_events').insert({
      event_type: eventType,
      identifier,
      user_id: userId,
      endpoint,
      details: details ? JSON.stringify(details) : null,
      ip_address: req?.ip || req?.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req?.headers.get('user-agent') || 'unknown',
      severity,
      resolved: false
    })
  } catch (error) {
    console.error('Errore nel logging di sicurezza:', error)
  }
}

/**
 * Verifica e aggiorna rate limiting per un identifier
 * @param identifier IP o user ID
 * @param endpoint Endpoint chiamato
 * @param maxRequests Numero massimo di richieste
 * @param windowMinutes Finestra temporale in minuti
 * @returns true se la richiesta è consentita
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests: number = 100,
  windowMinutes: number = 1
): Promise<boolean> {
  try {
    const { supabase } = await import("@/lib/supabase")
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)
    
    // Cerca record esistente nella finestra temporale
    const { data: existing, error } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Errore rate limit check:', error)
      return true // In caso di errore, permetti la richiesta
    }
    
    if (existing) {
      // Aggiorna counter
      const newCount = existing.requests_count + 1
      
      if (newCount > maxRequests) {
        // Blocca per i prossimi 5 minuti
        const blockedUntil = new Date(Date.now() + 5 * 60 * 1000)
        
        await supabase
          .from('rate_limits')
          .update({
            requests_count: newCount,
            blocked_until: blockedUntil.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        
        return false // Richiesta bloccata
      } else {
        // Incrementa counter
        await supabase
          .from('rate_limits')
          .update({
            requests_count: newCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        
        return true // Richiesta consentita
      }
    } else {
      // Crea nuovo record
      await supabase
        .from('rate_limits')
        .insert({
          identifier,
          endpoint,
          requests_count: 1,
          window_start: new Date().toISOString()
        })
      
      return true // Prima richiesta, consentita
    }
  } catch (error) {
    console.error('Errore rate limiting:', error)
    return true // In caso di errore, permetti la richiesta
  }
}
