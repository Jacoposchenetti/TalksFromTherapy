import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Crea un client admin specifico per operazioni privilegiate
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

    console.log('Creating account for:', email)

    // Prima verifica se l'utente esiste già usando admin.listUsers
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return NextResponse.json(
        { error: 'Errore nel controllo utenti esistenti' },
        { status: 500 }
      )
    }

    const existingUser = existingUsers.users.find(user => user.email === email)
    
    let userId: string
    let isNewUser = false

    if (existingUser) {
      console.log('User already exists, updating subscription status')
      userId = existingUser.id
      
      // L'utente esiste già, aggiorna solo lo stato dell'abbonamento tramite API admin
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          user_metadata: {
            ...existingUser.user_metadata,
            subscription_status: existingUser.email_confirmed_at ? 'active' : 'pending_confirmation',
            subscription_stripe_id: sessionId,
            subscription_expires_at: null
          }
        }
      )

      if (updateError) {
        console.error('Error updating existing user:', updateError)
        return NextResponse.json(
          { error: `Errore nell'aggiornamento dell'account: ${updateError.message}` },
          { status: 500 }
        )
      }
    } else {
      console.log('Creating new user account')
      isNewUser = true

      console.log('Attempting to create user with admin API...')
      // Proviamo un approccio più diretto - createUser senza email_confirm
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Conferma automaticamente per evitare problemi di policies
        user_metadata: {
          name,
          license_number: licenseNumber || null,
          subscription_status: 'active', // Stato attivo subito
          subscription_stripe_id: sessionId,
          subscription_expires_at: null
        },
        email_confirm: true // L'utente è già confermato automaticamente
      })

      if (authError) {
        console.error('Auth error details:', {
          message: authError.message,
          status: authError.status,
          details: authError
        })
        return NextResponse.json(
          { error: `Errore nella creazione dell'account: ${authError.message}` },
          { status: 500 }
        )
      }

      if (!authData.user) {
        return NextResponse.json(
          { error: 'Account non creato' },
          { status: 500 }
        )
      }

      userId = authData.user.id
      console.log('Account created successfully (pending email confirmation):', userId)
    }

    // Aggiungi i crediti iniziali per l'abbonamento (anche se l'account non è ancora attivo)
    const { data: existingCredits } = await supabaseAdmin
      .from('user_credits')
      .select('credits')
      .eq('user_id', userId)
      .single()

    const currentCredits = existingCredits?.credits || 0
    const creditsToAdd = Math.min(1000, 2000 - currentCredits)

    if (creditsToAdd > 0) {
      const { error: creditsError } = await supabaseAdmin
        .from('user_credits')
        .upsert({
          user_id: userId,
          credits: currentCredits + creditsToAdd,
          updated_at: new Date().toISOString()
        })

      if (creditsError) {
        console.error('Credits error:', creditsError)
        // Non blocchiamo per errori sui crediti
      }
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      credits_added: creditsToAdd,
      is_new_user: isNewUser,
      requires_email_confirmation: isNewUser, // Indica se serve confermare l'email
      message: isNewUser 
        ? 'Account creato! Controlla la tua email per confermare e attivare l\'abbonamento.' 
        : 'Abbonamento aggiornato!'
    })

  } catch (error) {
    console.error('Account creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      },
      { status: 500 }
    )
  }
}
