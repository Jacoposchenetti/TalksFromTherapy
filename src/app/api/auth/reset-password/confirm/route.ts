import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from "next/server"
import { sanitizeInput, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"

export const runtime = 'nodejs'

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

    if (!accessToken || !refreshToken) {
      return createErrorResponse("Token mancanti", 400)
    }

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
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    if (sessionError) {
      console.error('Session error:', sessionError)
      return createErrorResponse('Token non valido o scaduto', 400)
    }

    // Aggiorna la password
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

  } catch (error) {
    console.error('Password reset confirm error:', error)
    return createErrorResponse('Errore interno del server', 500)
  }
}
