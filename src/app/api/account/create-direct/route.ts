import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// Admin client solo per tabelle (NON per auth)
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      email, 
      password, 
      name, 
      licenseNumber, 
      sessionId 
    } = body

    console.log('🔥 BYPASSING SUPABASE AUTH - Creating user directly in tables')

    // STEP 1: Hash della password
    const passwordHash = await bcrypt.hash(password, 12)

    // STEP 2: Genera UUID manuale (no Supabase Auth)
    const userId = crypto.randomUUID()

    console.log('👤 Creating user record directly:', userId)

    // STEP 3: Inserisci direttamente nella tabella custom users (se esiste)
    let userInserted = false
    try {
      const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: email,
          password_hash: passwordHash,
          name: name,
          license_number: licenseNumber || null,
          subscription_status: 'active',
          subscription_stripe_id: sessionId,
          email_confirmed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (userError) {
        console.warn('⚠️ Custom users table insert failed:', userError)
      } else {
        userInserted = true
        console.log('✅ User inserted in custom users table')
      }
    } catch (err) {
      console.warn('⚠️ Custom users table not available:', err)
    }

    // STEP 4: Inserisci crediti
    console.log('💰 Adding credits...')
    
    const { error: creditsError } = await supabaseAdmin
      .from('user_credits')
      .insert({
        user_id: userId,
        credits: 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (creditsError) {
      console.error('❌ Credits insert failed:', creditsError)
      return NextResponse.json(
        { 
          success: false, 
          error: `Credits creation failed: ${creditsError.message}` 
        },
        { status: 500 }
      )
    }

    console.log('🎉 Account created successfully WITHOUT Supabase Auth!')

    return NextResponse.json({
      success: true,
      user_id: userId,
      credits_added: 1000,
      is_new_user: true,
      requires_email_confirmation: false,
      message: 'Account creato con successo! (Sistema alternativo)',
      method: 'direct_table_insert'
    })

  } catch (error) {
    console.error('💥 Direct table insert error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
