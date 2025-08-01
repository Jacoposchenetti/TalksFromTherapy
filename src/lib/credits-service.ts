import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { 
  UserCredits, 
  CreditTransaction, 
  CreditFeature, 
  TransactionType, 
  CREDIT_COSTS 
} from './credits-config'

export class CreditsService {
  private supabase = supabase
  // Client amministratore per operazioni che bypassano RLS
  private supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  /**
   * Ottiene i crediti dell'utente con controllo reset mensile
   */
  async getUserCredits(userId: string): Promise<UserCredits> {
    // Prima controlla se esiste il record
    let { data: credits, error } = await this.supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch user credits: ${error.message}`)
    }

    // Se non esiste, inizializza
    if (!credits) {
      credits = await this.initializeUserCredits(userId)
    }

    // Controlla se serve reset mensile
    const needsReset = this.shouldResetMonthlyCredits(credits.last_reset_date)
    if (needsReset) {
      return await this.resetMonthlyCredits(userId)
    }

    return credits
  }

  /**
   * TRANSAZIONE ATOMICA: Deduce crediti solo se sufficienti
   */
  async deductCredits(
    userId: string, 
    feature: CreditFeature, 
    description: string,
    referenceId?: string
  ): Promise<number> {
    const amount = CREDIT_COSTS[feature]
    
    console.log(`🔸 Deducting ${amount} credits for ${feature} - User: ${userId}`)

    // Usa la funzione PostgreSQL atomica con client admin
    const { data, error } = await this.supabaseAdmin
      .rpc('deduct_credits_atomic', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description,
        p_feature_used: feature,
        p_reference_id: referenceId
      })

    if (error) {
      console.error('❌ Credits deduction failed:', error)
      if (error.message.includes('Crediti insufficienti')) {
        throw new Error('Crediti insufficienti per questa operazione')
      }
      throw new Error(`Failed to deduct credits: ${error.message}`)
    }

    console.log(`✅ Credits deducted successfully. New balance: ${data}`)
    return data
  }

  /**
   * TRANSAZIONE ATOMICA: Aggiunge crediti
   */
  async addCredits(
    userId: string,
    amount: number,
    type: TransactionType,
    description: string,
    stripePaymentIntentId?: string
  ): Promise<number> {
    console.log(`🔸 Adding ${amount} credits - User: ${userId}, Type: ${type}`)

    const { data, error } = await this.supabaseAdmin
      .rpc('add_credits_atomic', {
        p_user_id: userId,
        p_amount: amount,
        p_type: type,
        p_description: description,
        p_stripe_payment_intent_id: stripePaymentIntentId
      })

    if (error) {
      console.error('❌ Credits addition failed:', error)
      throw new Error(`Failed to add credits: ${error.message}`)
    }

    console.log(`✅ Credits added successfully. New balance: ${data}`)
    return data
  }

  /**
   * Controlla se l'utente ha crediti sufficienti per un'operazione
   */
  async hasEnoughCredits(userId: string, feature: CreditFeature): Promise<boolean> {
    const credits = await this.getUserCredits(userId)
    const required = CREDIT_COSTS[feature]
    return credits.credits_balance >= required
  }

  /**
   * Ottiene lo storico transazioni dell'utente
   */
  async getCreditTransactions(
    userId: string, 
    limit: number = 50
  ): Promise<CreditTransaction[]> {
    const { data, error } = await this.supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`)
    }

    return data || []
  }

  /**
   * Reset mensile crediti usando funzione atomica con rollover
   */
  private async resetMonthlyCredits(userId: string): Promise<UserCredits> {
    console.log(`🔄 Resetting monthly credits with rollover for user: ${userId}`)

    const { error } = await this.supabaseAdmin
      .rpc('reset_monthly_credits_with_rollover', { p_user_id: userId })

    if (error) {
      throw new Error(`Failed to reset monthly credits: ${error.message}`)
    }

    // Riottieni i crediti aggiornati
    const { data: credits, error: fetchError } = await this.supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch updated credits: ${fetchError.message}`)
    }

    console.log(`✅ Monthly credits reset with rollover successfully`)
    return credits
  }

  /**
   * Inizializza crediti per nuovo utente o restituisce crediti esistenti
   */
  private async initializeUserCredits(userId: string): Promise<UserCredits> {
    console.log(`🆕 Initializing credits for user: ${userId}`)

    // Prima controlla se l'utente esiste già (con admin client)
    const { data: existingCredits, error: fetchError } = await this.supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existingCredits && !fetchError) {
      console.log(`✅ User already has credits: ${existingCredits.credits_balance}`)
      return existingCredits
    }

    // Se non esiste, crea nuovo record
    const { data, error } = await this.supabaseAdmin
      .from('user_credits')
      .insert({
        user_id: userId,
        credits_balance: 1000, // 1000 crediti iniziali gratis (primo mese)
        monthly_credits: 1000,
        last_reset_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to initialize user credits: ${error.message}`)
    }

    // Log del bonus iniziale (anche questo con admin client)
    await this.supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: userId,
        type: 'bonus',
        amount: 1000,
        description: 'Crediti di benvenuto - primo mese gratuito'
      })

    console.log(`✅ User credits initialized with welcome bonus (1000 credits)`)
    return data
  }

  /**
   * Controlla se è necessario il reset mensile
   */
  private shouldResetMonthlyCredits(lastResetDate: string): boolean {
    const lastReset = new Date(lastResetDate)
    const today = new Date()
    
    // Se è passato almeno un mese dal reset
    const nextResetDate = new Date(
      lastReset.getFullYear(), 
      lastReset.getMonth() + 1, 
      lastReset.getDate()
    )
    
    return today >= nextResetDate
  }

  /**
   * Statistiche utilizzo crediti
   */
  async getCreditStats(userId: string): Promise<{
    totalUsed: number
    totalPurchased: number
    mostUsedFeature: string | null
    monthlyUsage: number
  }> {
    const { data, error } = await this.supabase
      .from('credit_transactions')
      .select('type, amount, feature_used, created_at')
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to fetch credit stats: ${error.message}`)
    }

    const transactions = data || []
    const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    const stats = {
      totalUsed: transactions
        .filter(t => t.type === 'usage')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      
      totalPurchased: transactions
        .filter(t => t.type === 'purchase')
        .reduce((sum, t) => sum + t.amount, 0),
      
      monthlyUsage: transactions
        .filter(t => 
          t.type === 'usage' && 
          t.created_at.startsWith(thisMonth)
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      
      mostUsedFeature: this.getMostUsedFeature(transactions)
    }

    return stats
  }

  private getMostUsedFeature(transactions: any[]): string | null {
    const featureUsage = transactions
      .filter(t => t.type === 'usage' && t.feature_used)
      .reduce((acc, t) => {
        acc[t.feature_used] = (acc[t.feature_used] || 0) + Math.abs(t.amount)
        return acc
      }, {} as Record<string, number>)

    const entries = Object.entries(featureUsage)
    if (entries.length === 0) return null

    return entries.reduce((max, [feature, usage]) => 
      usage > max[1] ? [feature, usage] : max
    )[0]
  }
}
