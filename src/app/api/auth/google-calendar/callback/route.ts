import { NextRequest, NextResponse } from "next/server"
import { GoogleCalendarService } from "@/lib/google-calendar"

/**
 * 🔄 GET /api/auth/google-calendar/callback
 * Gestisce il callback di autorizzazione Google Calendar
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // User ID passato nel state
  const error = searchParams.get('error')

  // Se l'utente ha rifiutato l'autorizzazione
  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/calendar?error=authorization_denied`
    )
  }

  // Se manca il code di autorizzazione
  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/calendar?error=no_authorization_code`
    )
  }

  try {
    console.log('📞 Callback received - Code:', code ? 'Present' : 'Missing', 'State:', state)
    
    const googleCalendarService = new GoogleCalendarService()
    
    // Scambia code per tokens
    console.log('🔄 Exchanging code for tokens...')
    const tokens = await googleCalendarService.getTokensFromCode(code)
    console.log('✅ Tokens received:', {
      access_token: tokens.access_token ? 'Present' : 'Missing',
      refresh_token: tokens.refresh_token ? 'Present' : 'Missing',
      expiry_date: tokens.expiry_date
    })
    
    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    // Ottieni info utente Google
    console.log('👤 Fetching Google user info...')
    const googleUser = await googleCalendarService.getUserInfo(tokens.access_token)
    console.log('✅ Google user info:', {
      id: googleUser.id ? 'Present' : 'Missing',
      email: googleUser.email
    })
    
    if (!googleUser.id) {
      throw new Error('No Google user ID received')
    }

    // Se abbiamo lo state (user ID), salva l'integrazione
    if (state) {
      console.log('💾 Saving integration for user:', state)
      await googleCalendarService.saveIntegration(state, tokens, googleUser)
      console.log('✅ Integration saved successfully')
    } else {
      console.warn('⚠️ No state (user ID) provided, skipping integration save')
    }

    // Redirect al calendario con successo
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/calendar?success=true&email=${encodeURIComponent(googleUser.email || '')}`
    )
  } catch (error) {
    console.error('❌ Google Calendar callback error:', error)
    
    // Log dell'errore dettagliato per debug
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      })
    }
    
    let errorMessage = 'auth_failed'
    if (error instanceof Error) {
      if (error.message.includes('access_token')) {
        errorMessage = 'token_error'
      } else if (error.message.includes('user')) {
        errorMessage = 'user_info_error'
      } else if (error.message.includes('integrazione')) {
        errorMessage = 'save_error'
      }
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/calendar?error=${errorMessage}`
    )
  }
}
