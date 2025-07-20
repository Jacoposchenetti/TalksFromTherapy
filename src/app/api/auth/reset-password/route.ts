import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from "next/server"
import { sanitizeInput, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"

export const runtime = 'nodejs'

// Rate limiting per reset password - più restrittivo
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

function checkRateLimit(ip: string, maxRequests: number = 2, windowMs: number = 900000): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(ip) || { count: 0, lastReset: now }
  
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
    // Rate limiting più restrittivo - 2 tentativi ogni 15 minuti
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'localhost'
    
    if (!checkRateLimit(clientIP)) {
      return createErrorResponse('Troppi tentativi di reset password. Riprova tra 15 minuti.', 429)
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

    // Invia email di reset password
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password/confirm`
    })

    if (error) {
      console.error('Password reset error:', error)
      
      // Non rivelare se l'utente esiste o meno per sicurezza
      // Ritorna sempre successo per prevenire user enumeration
    }

    return createSuccessResponse({
      message: 'Se l\'email è registrata, riceverai un link per reimpostare la password.'
    })

  } catch (error) {
    console.error('Password reset error:', error)
    return createErrorResponse('Errore interno del server', 500)
  }
}
