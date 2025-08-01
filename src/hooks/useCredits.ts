import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { UserCredits, CreditTransaction, CreditFeature } from '@/lib/credits-config'

interface CreditStats {
  totalUsed: number
  totalPurchased: number
  mostUsedFeature: string | null
  monthlyUsage: number
}

export function useCredits() {
  const { data: session } = useSession()
  const [credits, setCredits] = useState<UserCredits | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [stats, setStats] = useState<CreditStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch crediti dell'utente
  const fetchCredits = async () => {
    if (!session?.user) return

    try {
      setError(null)
      const res = await fetch('/api/credits')
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch credits')
      }
      
      setCredits(data.data)
    } catch (error) {
      console.error('Failed to fetch credits:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch credits')
    }
  }

  // Fetch transazioni
  const fetchTransactions = async (limit: number = 50) => {
    if (!session?.user) return

    try {
      const res = await fetch(`/api/credits/transactions?limit=${limit}`)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch transactions')
      }
      
      setTransactions(data.data)
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    }
  }

  // Fetch statistiche
  const fetchStats = async () => {
    if (!session?.user) return

    try {
      const res = await fetch('/api/credits/stats')
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch stats')
      }
      
      setStats(data.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  // Deduce crediti con gestione errori
  const deductCredits = async (
    feature: CreditFeature, 
    description: string, 
    referenceId?: string
  ): Promise<boolean> => {
    if (!session?.user) {
      throw new Error('User not authenticated')
    }

    try {
      const res = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, description, referenceId })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        if (data.code === 'INSUFFICIENT_CREDITS') {
          throw new Error('Crediti insufficienti per questa operazione')
        }
        throw new Error(data.error || 'Failed to deduct credits')
      }
      
      // Aggiorna i crediti localmente per UI reattiva
      if (credits && data.data?.newBalance !== undefined) {
        setCredits({
          ...credits,
          credits_balance: data.data.newBalance
        })
      }
      
      return true
    } catch (error) {
      console.error('Failed to deduct credits:', error)
      throw error
    }
  }

  // Controlla se ha crediti sufficienti
  const hasEnoughCredits = (feature: CreditFeature): boolean => {
    if (!credits) return false
    
    const costs = {
      TRANSCRIPTION: 5,
      TOPIC_MODELLING: 1,
      CUSTOM_TOPIC_MODELLING: 1,
      SENTIMENT_ANALYSIS: 1,
      SEMANTIC_FRAME: 1,
      AI_INSIGHTS: 4,
      DOCUMENT_ANALYSIS: 3
    }
    
    return credits.credits_balance >= costs[feature]
  }

  // Refresh completo di tutti i dati
  const refresh = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchCredits(),
        fetchTransactions(),
        fetchStats()
      ])
    } finally {
      setLoading(false)
    }
  }

  // Fetch iniziale quando l'utente è autenticato
  useEffect(() => {
    if (session?.user) {
      refresh()
    } else {
      setLoading(false)
    }
  }, [session?.user])

  return {
    credits,
    transactions,
    stats,
    loading,
    error,
    deductCredits,
    hasEnoughCredits,
    refresh,
    fetchCredits,
    fetchTransactions,
    fetchStats
  }
}

// Hook semplificato per solo checking crediti
export function useCreditsCheck() {
  const { credits, hasEnoughCredits, loading } = useCredits()
  
  return {
    creditsBalance: credits?.credits_balance || 0,
    hasEnoughCredits,
    loading
  }
}
