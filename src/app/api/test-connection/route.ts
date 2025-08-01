import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Test endpoint per verificare connessione Supabase
export async function GET() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test con client normale
    const supabaseNormal = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Test con admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Test 1: Connessione base
    const { data: healthCheck, error: healthError } = await supabaseNormal
      .from('user_credits')
      .select('count')
      .limit(1)
    
    console.log('Health check result:', { healthCheck, healthError })
    
    // Test 2: Admin può accedere alle tabelle?
    const { data: adminTest, error: adminError } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .limit(1)
    
    console.log('Admin test result:', { adminTest, adminError })
    
    // Test 3: Admin può listare utenti?
    const { data: usersTest, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    console.log('Users list test:', { 
      usersCount: usersTest?.users?.length || 0, 
      usersError 
    })
    
    return NextResponse.json({
      success: true,
      tests: {
        healthCheck: !healthError,
        adminTableAccess: !adminError,
        adminUsersList: !usersError
      },
      errors: {
        healthError: healthError?.message,
        adminError: adminError?.message,
        usersError: usersError?.message
      }
    })

  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
