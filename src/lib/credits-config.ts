// Configurazione sistema crediti e pagamenti
export const CREDIT_COSTS = {
  TRANSCRIPTION: 5,           // 5 crediti per trascrizione
  TOPIC_MODELLING: 1,         // 1 credito per topic modelling automatico
  CUSTOM_TOPIC_MODELLING: 1,  // 1 credito per topic modelling custom
  SENTIMENT_ANALYSIS: 1,      // 1 credito per analisi sentiment
  SEMANTIC_FRAME: 1,          // 1 credito per semantic frame
  AI_INSIGHTS: 4,             // 4 crediti per insights AI avanzati (futuro)
  DOCUMENT_ANALYSIS: 3,       // 3 crediti per analisi documento (futuro)
} as const

export const SUBSCRIPTION_PLAN = {
  MONTHLY: {
    name: 'TalksFromTherapy Pro',
    price: 54, // €54/mese
    currency: 'EUR',
    credits: 1000, // 1000 crediti inclusi al mese
    rollover_enabled: true, // I crediti si accumulano
    rollover_limit: 2000, // Massimo 2000 crediti accumulabili (2 mesi)
    rollover_expiry_months: 12, // I crediti acquistati scadono dopo 12 mesi
    stripe_price_id: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_monthly_placeholder',
    features: [
      '1000 crediti mensili (si accumulano fino a 2000)',
      'Crediti acquistati non scadono per 12 mesi',
      '~80 trascrizioni complete (400 crediti)',
      '~80 topic modelling automatici (80 crediti)',
      '~220 topic modelling personalizzati (220 crediti)',
      '~80 analisi sentiment (80 crediti)',
      '~220 semantic frames (220 crediti)',
      'Supporto prioritario',
    ],
    breakdown: {
      transcriptions: { avg: 80, cost: 5, total: 400 },
      topicModelling: { avg: 80, cost: 1, total: 80 },
      customTopicModelling: { avg: 220, cost: 1, total: 220 },
      sentimentAnalysis: { avg: 80, cost: 1, total: 80 },
      semanticFrame: { avg: 220, cost: 1, total: 220 }
    }
  }
} as const

export const CREDIT_PACKAGES = {
  SMALL: { name: 'Small Pack', credits: 200, price: 8, stripe_price_id: 'price_credits_small' },   // €8 per 200 crediti (€0.04/credito)
  MEDIUM: { name: 'Medium Pack', credits: 500, price: 17, stripe_price_id: 'price_credits_medium' }, // €17 per 500 crediti (€0.034/credito)
  LARGE: { name: 'Large Pack', credits: 1000, price: 30, stripe_price_id: 'price_credits_large' }   // €30 per 1000 crediti (€0.03/credito)
} as const

// Tipi TypeScript
export type CreditFeature = keyof typeof CREDIT_COSTS
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'inactive'
export type TransactionType = 'monthly_reset' | 'purchase' | 'usage' | 'refund' | 'bonus'

export interface UserCredits {
  id: string
  user_id: string
  credits_balance: number
  monthly_credits: number
  last_reset_date: string
  created_at: string
  updated_at: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  description: string
  feature_used?: CreditFeature
  reference_id?: string
  stripe_payment_intent_id?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  status: SubscriptionStatus
  plan_type: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}
