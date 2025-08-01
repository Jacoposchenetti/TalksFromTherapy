import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      email, 
      password, 
      name, 
      licenseNumber, 
      sessionId 
    } = body

    console.log('🚀 Creating account with ORIGINAL working method for:', email)

    // METODO ORIGINALE CHE FUNZIONAVA - createServerClient con cookies
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
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Gestisce errori di set cookie in edge runtime
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Gestisce errori di remove cookie in edge runtime
            }
          },
        },
      }
    )

    // REGISTRAZIONE ORIGINALE CHE FUNZIONAVA
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
          subscription_status: 'active',
          subscription_stripe_id: sessionId,
          subscription_expires_at: null,
          created_via: 'stripe_payment',
          consent_date: new Date().toISOString(),
          consent_ip_address: clientIP
        }
      }
    })

    if (signUpError) {
      console.error('❌ SignUp error:', signUpError)
      return NextResponse.json(
        { 
          success: false, 
          error: `Registration failed: ${signUpError.message}`,
          details: signUpError
        },
        { status: 500 }
      )
    }

    if (!authData.user) {
      console.error('❌ No user data returned')
      return NextResponse.json(
        { success: false, error: 'No user data returned' },
        { status: 500 }
      )
    }

    const userId = authData.user.id
    console.log('✅ User created successfully with ORIGINAL method:', userId)

    // AGGIUNGI CREDITI (se necessario)
    let creditsAdded = 0
    try {
      const { error: creditsError } = await supabase
        .from('user_credits')
        .upsert({
          user_id: userId,
          credits: 1000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (!creditsError) {
        creditsAdded = 1000
        console.log('✅ Credits added successfully')
      }
    } catch (creditsErr) {
      console.warn('⚠️ Credits error (non-blocking):', creditsErr)
    }

    console.log('🎉 Account creation completed with ORIGINAL method')

    return NextResponse.json({
      success: true,
      user_id: userId,
      credits_added: creditsAdded,
      is_new_user: true,
      requires_email_confirmation: !authData.user.email_confirmed_at,
      message: 'Account creato con successo con il metodo originale!'
    })

  } catch (error) {
    console.error('💥 Fatal error with ORIGINAL method:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
