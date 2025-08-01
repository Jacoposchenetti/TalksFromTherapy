import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { CreditsService } from '@/lib/credits-service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
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
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
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
  
  // Se è un abbonamento e non abbiamo userId, potrebbe essere un nuovo utente
  if (!userId && session.customer_details?.email) {
    console.log(`🔍 No userId in metadata, checking for new user registration: ${session.customer_details.email}`)
    
    try {
      // Importa supabase admin per operazioni utente
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      // Prima controlla se l'utente esiste già
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
      const foundUser = authUsers?.users?.find(u => u.email === (session.customer_details as any)?.email)
      
      if (foundUser && !authError) {
        userId = foundUser.id
        console.log(`✅ Found existing user: ${userId}`)
      } else if (session.amount_total === 5400) { // €54 = abbonamento
        // Questo è un nuovo abbonamento, potrebbe essere necessario creare l'account
        // Per ora determiniamo solo il tipo, la creazione dell'account avverrà nella success page
        type = 'subscription'
        console.log(`🆕 New subscription payment detected for email: ${session.customer_details.email}`)
        
        // Non creiamo l'account qui, ma segniamo che è un abbonamento
        // L'account verrà creato nella pagina di successo usando i dati dal localStorage
        return // Usciamo qui per gli abbonamenti di nuovi utenti
      }
      
      if (foundUser) {
        // Determina il tipo dal totale per utenti esistenti
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
    console.log(`🎯 Activating subscription for user: ${userId}`)
    
    // Importa supabase admin per aggiornare lo stato abbonamento
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Ottieni i dettagli dell'abbonamento da Stripe
    let subscriptionId = session.subscription as string
    let currentPeriodEnd: Date
    
    if (subscriptionId) {
      // È un abbonamento - ottieni i dettagli reali da Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription
      currentPeriodEnd = new Date(subscription.current_period_end * 1000) // Stripe usa timestamp Unix
      console.log(`📅 Subscription period ends: ${currentPeriodEnd.toISOString()}`)
    } else {
      // Fallback: potrebbe essere un checkout one-time che crea un abbonamento
      // In questo caso, cerca l'abbonamento del customer
      if (session.customer) {
        const subscriptions = await stripe.subscriptions.list({
          customer: session.customer as string,
          status: 'active',
          limit: 1
        })
        
        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0] as Stripe.Subscription
          subscriptionId = subscription.id
          currentPeriodEnd = new Date(subscription.current_period_end * 1000)
          console.log(`📅 Found subscription, period ends: ${currentPeriodEnd.toISOString()}`)
        } else {
          throw new Error('No active subscription found for customer')
        }
      } else {
        throw new Error('No customer or subscription ID found')
      }
    }
    
    // Aggiorna lo stato dell'abbonamento nel database con i dati reali di Stripe
    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        subscription_status: 'active',
        subscription_expires_at: currentPeriodEnd.toISOString(),
        subscription_stripe_id: subscriptionId,
        updated_at: new Date().toISOString()
      })
    
    if (userUpdateError) {
      console.error('❌ Error updating user subscription status:', userUpdateError)
      throw userUpdateError
    }
    
    // Aggiungi 1000 crediti per l'abbonamento mensile (massimo 2000 totali)
    const creditsService = new CreditsService()
    
    // Verifica i crediti attuali prima di aggiungere
    const { data: currentCredits } = await supabaseAdmin
      .from('user_credits')
      .select('credits')
      .eq('user_id', userId)
      .single()
    
    const existingCredits = currentCredits?.credits || 0
    const creditsToAdd = Math.min(1000, 2000 - existingCredits) // Non superare 2000 totali
    
    if (creditsToAdd > 0) {
      await creditsService.addCredits(
        userId, 
        creditsToAdd, 
        'purchase',
        `Abbonamento mensile attivato - ${creditsToAdd} crediti aggiunti`
      )
      console.log(`💳 Added ${creditsToAdd} credits (existing: ${existingCredits}, new total: ${existingCredits + creditsToAdd})`)
    } else {
      console.log(`⚠️ No credits added - user already at maximum (${existingCredits}/2000)`)
    }
    
    console.log(`✅ Subscription activated: status updated and ${creditsToAdd} credits added to user ${userId}`)
    
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
    await creditsService.addCredits(
      userId, 
      creditsAmount, 
      'purchase',
      `Acquisto pacchetto ${packageType} - ${creditsAmount} crediti`
    )
    
    console.log(`✅ Credits purchase completed: ${creditsAmount} credits added to user ${userId}`)
    
  } catch (error) {
    console.error('❌ Errore nell\'aggiunta crediti:', error)
    throw error
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  try {
    console.log(`🚫 Processing subscription cancellation: ${subscription.id}`)
    
    // Importa supabase admin
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Trova l'utente con questo subscription ID
    const { data: users, error: findError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('subscription_stripe_id', subscription.id)
      .single()
    
    if (findError || !users) {
      console.error('❌ User not found for subscription:', subscription.id)
      return
    }
    
    // Aggiorna lo stato dell'abbonamento
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        subscription_status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('id', users.id)
    
    if (updateError) {
      console.error('❌ Error updating subscription status:', updateError)
      throw updateError
    }
    
    console.log(`✅ Subscription canceled for user: ${users.id}`)
    
  } catch (error) {
    console.error('❌ Error handling subscription cancellation:', error)
    throw error
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log(`💸 Processing payment failed: ${invoice.id}`)
    
    // Importa supabase admin
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Trova l'utente con questo subscription ID
    const { data: users, error: findError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('subscription_stripe_id', (invoice as any).subscription)
      .single()
    
    if (findError || !users) {
      console.error('❌ User not found for failed payment:', (invoice as any).subscription)
      return
    }
    
    // Aggiorna lo stato dell'abbonamento a expired
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        subscription_status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('id', users.id)
    
    if (updateError) {
      console.error('❌ Error updating subscription status after failed payment:', updateError)
      throw updateError
    }
    
    console.log(`✅ User subscription marked as expired due to failed payment: ${users.id}`)
    
  } catch (error) {
    console.error('❌ Error handling payment failure:', error)
    throw error
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log(`💰 Processing successful invoice payment: ${invoice.id}`)
    
    // Questo evento si verifica per i rinnovi automatici
    if (!(invoice as any).subscription) {
      console.log('⚠️ Invoice not related to subscription, skipping')
      return
    }
    
    // Ottieni i dettagli dell'abbonamento
    const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string) as Stripe.Subscription
    
    // Importa supabase admin
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Trova l'utente con questo subscription ID
    const { data: users, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('subscription_stripe_id', subscription.id)
      .single()
    
    if (findError || !users) {
      console.error('❌ User not found for subscription renewal:', subscription.id)
      return
    }
    
    // Aggiorna la data di scadenza con il nuovo periodo
    const newPeriodEnd = new Date(subscription.current_period_end * 1000)
    
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_expires_at: newPeriodEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', users.id)
    
    if (updateError) {
      console.error('❌ Error updating subscription renewal:', updateError)
      throw updateError
    }
    
    // Aggiungi crediti per il rinnovo (1000 crediti, massimo 2000 totali)
    const creditsService = new CreditsService()
    
    // Verifica i crediti attuali prima di aggiungere
    const { data: currentCredits } = await supabaseAdmin
      .from('user_credits')
      .select('credits')
      .eq('user_id', users.id)
      .single()
    
    const existingCredits = currentCredits?.credits || 0
    const creditsToAdd = Math.min(1000, 2000 - existingCredits) // Non superare 2000 totali
    
    if (creditsToAdd > 0) {
      await creditsService.addCredits(
        users.id, 
        creditsToAdd, 
        'purchase',
        `Rinnovo automatico abbonamento - ${creditsToAdd} crediti aggiunti`
      )
      console.log(`💳 Renewal: Added ${creditsToAdd} credits (existing: ${existingCredits}, new total: ${existingCredits + creditsToAdd})`)
    } else {
      console.log(`⚠️ Renewal: No credits added - user already at maximum (${existingCredits}/2000)`)
    }
    
    console.log(`✅ Subscription renewed for user: ${users.id} (${users.name}). New period ends: ${newPeriodEnd.toISOString()}. Credits added: ${creditsToAdd}`)
    
  } catch (error) {
    console.error('❌ Error handling invoice payment succeeded:', error)
    throw error
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log(`🔄 Processing subscription update: ${subscription.id}`)
    
    // Importa supabase admin
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Trova l'utente con questo subscription ID
    const { data: users, error: findError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('subscription_stripe_id', subscription.id)
      .single()
    
    if (findError || !users) {
      console.error('❌ User not found for subscription update:', subscription.id)
      return
    }
    
    // Aggiorna lo stato basato sullo stato di Stripe
    let newStatus = 'inactive'
    if (subscription.status === 'active') {
      newStatus = 'active'
    } else if (subscription.status === 'canceled') {
      newStatus = 'canceled'
    } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
      newStatus = 'expired'
    }
    
    const newPeriodEnd = new Date(subscription.current_period_end * 1000)
    
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        subscription_status: newStatus,
        subscription_expires_at: newPeriodEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', users.id)
    
    if (updateError) {
      console.error('❌ Error updating subscription status:', updateError)
      throw updateError
    }
    
    console.log(`✅ Subscription updated for user: ${users.id}. Status: ${newStatus}, Period ends: ${newPeriodEnd.toISOString()}`)
    
  } catch (error) {
    console.error('❌ Error handling subscription update:', error)
    throw error
  }
}
