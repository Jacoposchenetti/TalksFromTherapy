import { NextRequest } from "next/server"
import { createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { createClient } from '@supabase/supabase-js'

/**
 * 🔍 Debug API per testare la configurazione Google Calendar
 */
export async function GET(request: NextRequest) {
  try {
    const checks = {
      env_variables: {},
      supabase_connection: null,
      table_exists: null,
      google_credentials: null
    }

    // 1. Controlla variabili d'ambiente
    checks.env_variables = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL
    }

    // 2. Testa connessione Supabase
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      
      const { data, error } = await supabase.from('users').select('count').limit(1).single()
      checks.supabase_connection = !error
    } catch (error) {
      checks.supabase_connection = false
    }

    // 3. Controlla se la tabella google_calendar_integrations esiste
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      
      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .select('count')
        .limit(1)
      
      checks.table_exists = !error
    } catch (error) {
      checks.table_exists = false
    }

    // 4. Testa credenziali Google (senza fare richieste)
    checks.google_credentials = {
      client_id_format: process.env.GOOGLE_CLIENT_ID?.includes('.apps.googleusercontent.com'),
      client_secret_format: process.env.GOOGLE_CLIENT_SECRET?.startsWith('GOCSPX-'),
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google-calendar/callback`
    }

    return createSuccessResponse(checks)
  } catch (error) {
    console.error('Debug error:', error)
    return createErrorResponse(`Errore debug: ${error}`, 500)
  }
}
