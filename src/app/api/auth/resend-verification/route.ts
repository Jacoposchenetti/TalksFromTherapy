import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from "next/server"
import { sanitizeInput, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"

export const dynamic = 'force-dynamic'

// Rate limiting semplice in memoria (per produzione usare Redis)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

function checkRateLimit(ip: string, maxRequests: number = 3, windowMs: number = 300000): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(ip) || { count: 0, lastReset: now }
  
  // Reset counter se è passato il tempo
  if (now - userLimit.lastReset > windowMs) {
    userLimit.count = 0
    userLimit.lastReset = now
  }
  
  if (userLimit.count >= maxRequests) {
    return false
  }
  
  userLimit.count++
  rateLimitMap.set(ip, userLimit)
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 3 tentativi ogni 5 minuti
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'localhost'
    
    if (!checkRateLimit(clientIP)) {
      return createErrorResponse('Troppi tentativi. Riprova tra 5 minuti.', 429)
    }

    const body = await request.json()
    const email = sanitizeInput(body.email || '').toLowerCase()

    // Validazione
    if (!email) {
      return createErrorResponse("Email è obbligatoria", 400)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return createErrorResponse("Formato email non valido", 400)
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

    // Reinvia email di verifica
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
      }
    })

    if (error) {
      console.error('Resend verification error:', error)
      
      // Non rivelare se l'utente esiste o meno per sicurezza
      if (error.message.includes('User not found')) {
        return createErrorResponse('Se l\'email è registrata, riceverai un\'email di verifica.', 200)
      }
      
      return createErrorResponse('Errore durante l\'invio dell\'email: ' + error.message, 400)
    }

    return createSuccessResponse({
      message: 'Email di verifica inviata! Controlla la tua casella di posta.'
    })

  } catch (error) {
    console.error('Resend verification email error:', error)
    return createErrorResponse('Errore interno del server', 500)
  }
}
