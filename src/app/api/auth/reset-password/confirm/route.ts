import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from "next/server"
import { sanitizeInput, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const password = sanitizeInput(body.password || '')
    const accessToken = body.access_token
    const refreshToken = body.refresh_token

    // Validazioni
    if (!password) {
      return createErrorResponse("Password è obbligatoria", 400)
    }

    if (password.length < 8) {
      return createErrorResponse("La password deve essere di almeno 8 caratteri", 400)
    }

    if (!accessToken) {
      return createErrorResponse("Access token mancante", 400)
    }

    console.log('🔄 Reset password confirm API chiamata:', {
      hasPassword: !!password,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length
    })

    // Crea client Supabase
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Imposta la sessione con i token ricevuti
    let sessionData, sessionError
    
    console.log('🔄 Tentativo reset password con token:', {
      tokenType: accessToken.startsWith('pkce_') ? 'PKCE' : 'JWT',
      tokenStart: accessToken.substring(0, 20)
    })
    
    // Per i token PKCE (che iniziano con pkce_), usiamo un approccio diverso
    if (accessToken.startsWith('pkce_')) {
      console.log('🔄 Gestione token PKCE')
      // Per i token PKCE, usiamo direttamente updateUser senza setSession
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        }, {
          emailRedirectTo: undefined // Disabilita redirect
        })

        if (updateError) {
          console.error('Password update error con PKCE:', updateError)
          return createErrorResponse(`Errore durante l'aggiornamento: ${updateError.message}`, 500)
        }

        console.log('✅ Password aggiornata con successo via PKCE')
        return createSuccessResponse({
          message: 'Password aggiornata con successo'
        })
      } catch (error) {
        console.error('Errore PKCE:', error)
        return createErrorResponse('Errore durante l\'aggiornamento della password', 500)
      }
    } else {
      // Gestione JWT standard
      if (refreshToken) {
        console.log('🔄 Tentativo con access_token e refresh_token (JWT)')
        const result = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        sessionData = result.data
        sessionError = result.error
      } else {
        console.log('🔄 Tentativo solo con access_token (JWT)')
        const result = await supabase.auth.getUser(accessToken)
        if (result.error) {
          sessionError = result.error
        } else {
          sessionData = { user: result.data.user }
          sessionError = null
        }
      }
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        return createErrorResponse(`Token non valido o scaduto: ${sessionError.message}`, 400)
      }

      console.log('✅ Sessione valida, aggiornamento password...')

      // Aggiorna la password per JWT
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error('Password update error:', updateError)
        return createErrorResponse('Errore durante l\'aggiornamento della password', 500)
      }

      // Logout dopo il reset per forzare un nuovo login
      await supabase.auth.signOut()

      return createSuccessResponse({
        message: 'Password aggiornata con successo'
      })
    }

  } catch (error) {
    console.error('Password reset confirm error:', error)
    return createErrorResponse('Errore interno del server', 500)
  }
}
