import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { CreditsService } from '@/lib/credits-service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    // Verifica la signature del webhook per sicurezza
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (err: any) {
    console.error('⚠️  Webhook signature verification failed.', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('✅ Webhook ricevuto:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      
      default:
        console.log(`Evento non gestito: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Errore nel processare webhook:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' }, 
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('💳 Processing checkout completed:', session.id)
  
  // Estrai i metadati dal session
  let metadata = session.metadata || {}
  let userId = metadata?.userId
  let type = metadata?.type
  
  // FALLBACK: Se non ci sono metadati, prova a recuperare l'utente dall'email
  if (!userId && session.customer_details?.email) {
    console.log(`🔍 No userId in metadata, trying to find user by email: ${session.customer_details.email}`)
    
    try {
      // Importa supabase admin per cercare l'utente
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      // Query per trovare l'utente tramite l'associazione con la sessione
      // Usiamo un approccio diverso: cerchiamo nelle transazioni recenti o nella user_credits
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
      
      const foundUser = authUsers?.users?.find(u => u.email === session.customer_details.email)
      
      if (foundUser && !authError) {
        userId = foundUser.id
        // Determina il tipo dal totale (amount_total è in centesimi)
        const amount = session.amount_total || 0
        if (amount === 800) { // €8 = 800 centesimi
          type = 'credits'
          metadata = { ...metadata, credits: '300', package: 'Base' }
        } else if (amount === 1700) { // €17 = 1700 centesimi
          type = 'credits'
          metadata = { ...metadata, credits: '700', package: 'Standard' }
        } else if (amount === 3000) { // €30 = 3000 centesimi
          type = 'credits'
          metadata = { ...metadata, credits: '1500', package: 'Premium' }
        } else if (amount === 5400) { // €54 = 5400 centesimi
          type = 'subscription'
        }
        console.log(`✅ Found user by email: ${userId}, inferred type: ${type}, amount: ${amount}`)
      }
    } catch (error) {
      console.error('❌ Error finding user by email:', error)
    }
  }
  
  if (!userId || !type) {
    console.error('❌ Still missing userId or type after fallback:', { 
      userId, 
      type, 
      email: session.customer_details?.email,
      amount: session.amount_total 
    })
    return
  }

  if (type === 'subscription') {
    await handleSubscriptionActivation(userId, session)
  } else if (type === 'credits') {
    await handleCreditsPurchase(userId, metadata, session)
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('💰 Processing payment succeeded:', paymentIntent.id)
  
  const metadata = paymentIntent.metadata
  if (!metadata?.userId || !metadata?.type) {
    console.error('❌ Metadati mancanti nel payment intent:', paymentIntent.id)
    return
  }

  const userId = metadata.userId
  const type = metadata.type
  
  if (type === 'credits') {
    await handleCreditsPurchase(userId, metadata, paymentIntent)
  }
}

async function handleSubscriptionActivation(userId: string, session: Stripe.Checkout.Session) {
  try {
    console.log(`🎯 Attivating subscription for user: ${userId}`)
    
    const creditsService = new CreditsService()
    
    // Aggiungi 1000 crediti per l'abbonamento mensile
    await creditsService.addCreditsFromWebhook(
      userId, 
      1000, 
      'Abbonamento mensile attivato',
      session.payment_intent as string
    )
    
    console.log(`✅ Subscription activated: 1000 credits added to user ${userId}`)
    
  } catch (error) {
    console.error('❌ Errore nell\'attivazione abbonamento:', error)
    throw error
  }
}

async function handleCreditsPurchase(
  userId: string, 
  metadata: Record<string, string>, 
  paymentObject: Stripe.Checkout.Session | Stripe.PaymentIntent
) {
  try {
    const creditsAmount = parseInt(metadata.credits || '0')
    const packageType = metadata.package || 'unknown'
    
    if (creditsAmount <= 0) {
      console.error('❌ Quantità crediti non valida:', creditsAmount)
      return
    }
    
    console.log(`🎯 Adding ${creditsAmount} credits to user: ${userId} (package: ${packageType})`)
    
    const creditsService = new CreditsService()
    
    // Aggiungi i crediti acquistati
    await creditsService.addCreditsFromWebhook(
      userId, 
      creditsAmount, 
      `Acquisto pacchetto ${packageType} - ${creditsAmount} crediti`,
      typeof paymentObject.payment_intent === 'string' ? paymentObject.payment_intent : paymentObject.id
    )
    
    console.log(`✅ Credits purchase completed: ${creditsAmount} credits added to user ${userId}`)
    
  } catch (error) {
    console.error('❌ Errore nell\'aggiunta crediti:', error)
    throw error
  }
}
