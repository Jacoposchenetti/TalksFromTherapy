import { createClient } from '@supabase/supabase-js'

export interface SubscriptionStatus {
  isActive: boolean
  status: 'active' | 'expired' | 'canceled' | 'inactive'
  expiresAt: string | null
  daysRemaining: number | null
}

export async function checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_status, subscription_expires_at')
      .eq('id', userId)
      .single()
    
    if (error || !user) {
      return {
        isActive: false,
        status: 'inactive',
        expiresAt: null,
        daysRemaining: null
      }
    }
    
    const status = user.subscription_status || 'inactive'
    const expiresAt = user.subscription_expires_at
    
    // Calcola i giorni rimanenti
    let daysRemaining = null
    let isActive = false
    
    if (expiresAt && status === 'active') {
      const expireDate = new Date(expiresAt)
      const today = new Date()
      const diffTime = expireDate.getTime() - today.getTime()
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      // Se è scaduto, lo stato dovrebbe essere aggiornato
      if (daysRemaining <= 0) {
        // Aggiorna lo stato nel database
        await supabase
          .from('users')
          .update({ subscription_status: 'expired' })
          .eq('id', userId)
        
        isActive = false
      } else {
        isActive = true
      }
    }
    
    return {
      isActive,
      status: isActive ? 'active' : status as any,
      expiresAt,
      daysRemaining
    }
    
  } catch (error) {
    console.error('Error checking subscription status:', error)
    return {
      isActive: false,
      status: 'inactive',
      expiresAt: null,
      daysRemaining: null
    }
  }
}

export async function requireActiveSubscription(userId: string): Promise<boolean> {
  const status = await checkSubscriptionStatus(userId)
  return status.isActive
}
