import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * 🔍 Debug endpoint per controllare lo stato del database
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking database status...')
    
    // Test connessione base
    const { data: basicTest, error: basicError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    console.log('Basic connection test:', { basicTest, basicError })
    
    // Test tabella google_calendar_integrations
    const { data: tableTest, error: tableError } = await supabase
      .from('google_calendar_integrations')
      .select('count')
      .limit(1)
    
    console.log('Google Calendar table test:', { tableTest, tableError })
    
    // Test inserimento dummy (senza salvare)
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000',
      google_user_id: 'test',
      access_token: 'test',
      refresh_token: 'test',
      token_expires_at: new Date().toISOString(),
      calendar_id: 'primary',
      calendar_name: 'test@example.com',
      sync_enabled: true
    }
    
    // Dry run - non inserisce realmente
    const { error: insertError } = await supabase
      .from('google_calendar_integrations')
      .insert(testData)
      .select()
    
    console.log('Insert test error:', insertError)
    
    return NextResponse.json({
      success: true,
      tests: {
        basicConnection: !basicError,
        tableExists: !tableError,
        canInsert: !insertError || insertError.code === '23505', // 23505 = unique violation is OK
        errors: {
          basic: basicError?.message,
          table: tableError?.message,
          insert: insertError?.message
        }
      }
    })
  } catch (error) {
    console.error('❌ Database debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
