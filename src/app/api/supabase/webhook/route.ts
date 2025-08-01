import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { type, record } = await req.json()

    console.log('Supabase webhook received:', type)

    // Gestisce quando un utente conferma l'email
    if (type === 'INSERT' && record.table === 'auth.users' && record.email_confirmed_at) {
      await handleEmailConfirmed(record)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Supabase webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleEmailConfirmed(userRecord: any) {
  try {
    console.log(`📧 Email confirmed for user: ${userRecord.email}`)

    // Controlla se l'utente ha una subscription pending
    const currentMetadata = userRecord.user_metadata || {}
    
    if (currentMetadata.subscription_status === 'pending_confirmation') {
      // Attiva l'abbonamento ora che l'email è confermata
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userRecord.id,
        {
          user_metadata: {
            ...currentMetadata,
            subscription_status: 'active', // Ora diventa attivo!
            email_confirmed_at: new Date().toISOString()
          }
        }
      )

      if (updateError) {
        console.error('Error activating subscription after email confirmation:', updateError)
        return
      }

      console.log(`✅ Subscription activated for user: ${userRecord.email}`)
    }

  } catch (error) {
    console.error('Error handling email confirmation:', error)
  }
}
