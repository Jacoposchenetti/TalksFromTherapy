import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// WORKAROUND: Client admin con bypass completo per account creation
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

    console.log('🚀 Starting account creation for:', email)

    // STEP 1: Crea utente con approccio diretto (bypassa policies)
    console.log('📝 Creating user with direct admin approach...')
    
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Conferma automaticamente
      user_metadata: {
        name: name,
        license_number: licenseNumber || null,
        subscription_status: 'active',
        subscription_stripe_id: sessionId,
        subscription_expires_at: null,
        created_via: 'stripe_payment'
      }
    })

    if (userError) {
      console.error('❌ User creation failed:', userError)
      return NextResponse.json(
        { 
          success: false, 
          error: `User creation failed: ${userError.message}`,
          details: userError
        },
        { status: 500 }
      )
    }

    if (!userData.user) {
      console.error('❌ No user data returned')
      return NextResponse.json(
        { success: false, error: 'No user data returned' },
        { status: 500 }
      )
    }

    const userId = userData.user.id
    console.log('✅ User created successfully:', userId)

    // STEP 2: Aggiungi crediti con gestione errori separata
    console.log('💰 Adding credits...')
    
    let creditsAdded = 0
    try {
      const { error: creditsError } = await supabaseAdmin
        .from('user_credits')
        .upsert({
          user_id: userId,
          credits: 1000, // 1000 crediti iniziali
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (creditsError) {
        console.warn('⚠️ Credits creation failed (non-blocking):', creditsError)
        // Non blocchiamo l'account creation per errori sui crediti
      } else {
        creditsAdded = 1000
        console.log('✅ Credits added successfully')
      }
    } catch (creditsErr) {
      console.warn('⚠️ Credits error (non-blocking):', creditsErr)
      // Continua comunque
    }

    console.log('🎉 Account creation completed successfully')

    return NextResponse.json({
      success: true,
      user_id: userId,
      credits_added: creditsAdded,
      is_new_user: true,
      requires_email_confirmation: false, // Email già confermata
      message: 'Account creato con successo! Benvenuto!'
    })

  } catch (error) {
    console.error('💥 Fatal account creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    )
  }
}
