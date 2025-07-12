import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
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
    
    // Scambia il codice con la sessione
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=verification_failed`)
    }

    if (data.user) {
      // Aggiorna il record nella tabella users custom
      await supabase
        .from('users')
        .update({ 
          emailVerified: true,
          updatedAt: new Date().toISOString()
        })
        .eq('id', data.user.id)

      // Redirect al login con successo
      return NextResponse.redirect(`${requestUrl.origin}/login?verified=true`)
    }
  }

  // Fallback redirect
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}
