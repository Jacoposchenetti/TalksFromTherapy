import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from "next/server"
import { sanitizeInput, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"

export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Sanitizzazione e validazione input
    const name = sanitizeInput(body.name || '')
    const email = sanitizeInput(body.email || '').toLowerCase()
    const password = body.password || ''
    const licenseNumber = sanitizeInput(body.licenseNumber || '')
    const acceptTerms = body.acceptTerms === true
    const acceptPrivacy = body.acceptPrivacy === true

    // Validazione base
    if (!name || name.length < 2 || name.length > 100) {
      return createErrorResponse("Il nome deve essere tra 2 e 100 caratteri", 400)
    }

    if (!email || !password) {
      return createErrorResponse("Nome, email e password sono obbligatori", 400)
    }

    if (password.length < 8) {
      return createErrorResponse("La password deve essere di almeno 8 caratteri", 400)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return createErrorResponse("Formato email non valido", 400)
    }

    // Verifica consenso GDPR
    if (!acceptTerms || !acceptPrivacy) {
      return createErrorResponse('Devi accettare i termini di servizio e la privacy policy', 400)
    }

    // Crea client Supabase
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Usiamo anon key per la registrazione
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

    // REGISTRAZIONE CON SUPABASE AUTH - Salva tutto nei metadati
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'localhost'

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          license_number: licenseNumber || null,
          consent_terms_accepted: acceptTerms,
          consent_privacy_accepted: acceptPrivacy,
          consent_date: new Date().toISOString(),
          consent_ip_address: clientIP
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
      }
    })

    if (signUpError) {
      console.error('Supabase signup error:', signUpError)
      return createErrorResponse('Errore durante la registrazione: ' + signUpError.message, 400)
    }

    if (!authData.user) {
      return createErrorResponse('Errore durante la creazione dell\'account', 500)
    }

    // Il trigger si occuperà di creare il record in public.users quando l'email viene confermata

    return createSuccessResponse({
      message: 'Registrazione completata! Controlla la tua email per attivare l\'account.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        emailVerified: false
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return createErrorResponse('Errore interno del server', 500)
  }
}
