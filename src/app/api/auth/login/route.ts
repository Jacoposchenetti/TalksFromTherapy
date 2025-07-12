import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeInput, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Sanitizzazione e validazione
    const email = sanitizeInput(body.email || '').toLowerCase()
    const password = body.password || ''

    if (!email || !password) {
      return createErrorResponse('Email e password sono obbligatori', 400)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return createErrorResponse('Formato email non valido', 400)
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

    // TENTATIVO LOGIN CON SUPABASE AUTH
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      console.error('Supabase signin error:', signInError)
      return createErrorResponse('Email o password non corretti', 401)
    }

    if (!authData.user) {
      return createErrorResponse('Errore durante il login', 500)
    }

    // CONTROLLA SE EMAIL È VERIFICATA
    if (!authData.user.email_confirmed_at) {
      return createErrorResponse('Devi verificare la tua email prima di accedere. Controlla la tua casella di posta.', 403, {
        code: 'EMAIL_NOT_VERIFIED',
        email: authData.user.email
      })
    }

    // RECUPERA DATI UTENTE DALLA TABELLA CUSTOM
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (userError || !userData) {
      console.error('Error fetching user data:', userError)
      return createErrorResponse('Errore nel recupero dati utente', 500)
    }

    return createSuccessResponse({
      message: 'Login effettuato con successo',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        licenseNumber: userData.licenseNumber,
        emailVerified: true
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return createErrorResponse('Errore interno del server', 500)
  }
}
