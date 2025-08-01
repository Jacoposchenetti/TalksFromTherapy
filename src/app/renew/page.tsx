'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, AlertTriangle, CreditCard, ArrowRight } from "lucide-react"
import { getStripe } from "@/lib/stripe"

interface UserSubscription {
  subscription_status: string
  subscription_expires_at: string | null
  name: string
  email: string
}

export default function RenewSubscriptionPage() {
  const [user, setUser] = useState<UserSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRenewing, setIsRenewing] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkUserSubscription()
  }, [])

  const checkUserSubscription = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Verifica che l'utente sia autenticato
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push('/auth/signin')
        return
      }

      // Ottieni i dati dell'abbonamento
      const { data: userData, error } = await supabase
        .from('users')
        .select('subscription_status, subscription_expires_at, name, email')
        .eq('id', authUser.id)
        .single()

      if (error || !userData) {
        console.error('Error fetching user data:', error)
        router.push('/dashboard')
        return
      }

      setUser(userData)

      // Calcola i giorni rimanenti se c'è una data di scadenza
      if (userData.subscription_expires_at) {
        const expireDate = new Date(userData.subscription_expires_at)
        const today = new Date()
        const diffTime = expireDate.getTime() - today.getTime()
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        setDaysRemaining(days)
      }

      // Se l'abbonamento è attivo, reindirizza al dashboard
      if (userData.subscription_status === 'active' && daysRemaining && daysRemaining > 0) {
        router.push('/dashboard')
        return
      }

    } catch (error) {
      console.error('Error checking subscription:', error)
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRenewSubscription = async () => {
    if (!user) return

    setIsRenewing(true)

    try {
      const stripe = await getStripe()
      if (!stripe) throw new Error('Stripe non caricato')

      // Ottieni l'ID dell'utente corrente
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        throw new Error('Utente non autenticato')
      }

      // Reindirizza a Stripe Checkout con metadata per identificare l'utente
      const { error } = await stripe.redirectToCheckout({
        lineItems: [
          {
            price: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'price_1Rpsx1BREm5eW1ln8HbFV8Oy', // ID del tuo piano mensile
            quantity: 1,
          },
        ],
        mode: 'subscription',
        successUrl: `${window.location.origin}/dashboard?renewed=true`,
        cancelUrl: `${window.location.origin}/renew`,
        customerEmail: user.email
      })

      if (error) {
        console.error('Stripe error:', error)
        throw new Error(error.message || 'Errore nel processo di pagamento')
      }

    } catch (error) {
      console.error('Renewal error:', error)
      alert(`Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
    } finally {
      setIsRenewing(false)
    }
  }

  const getStatusBadge = () => {
    if (!user) return null

    switch (user.subscription_status) {
      case 'expired':
        return <Badge variant="destructive" className="gap-2"><AlertTriangle className="w-4 h-4" />Scaduto</Badge>
      case 'canceled':
        return <Badge variant="secondary" className="gap-2"><Clock className="w-4 h-4" />Cancellato</Badge>
      default:
        return <Badge variant="outline" className="gap-2"><Clock className="w-4 h-4" />Inattivo</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Rinnova il Tuo Abbonamento
          </h1>
          <p className="text-gray-600">
            Continua a utilizzare TalksFromTherapy senza interruzioni
          </p>
        </div>

        {/* Stato Abbonamento */}
        <Card className="mb-6 border-2 border-red-200 bg-red-50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-red-800">Stato Abbonamento</CardTitle>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-red-700">
                <strong>Nome:</strong> {user?.name}
              </p>
              <p className="text-red-700">
                <strong>Email:</strong> {user?.email}
              </p>
              {user?.subscription_expires_at && (
                <p className="text-red-700">
                  <strong>Scaduto il:</strong> {new Date(user.subscription_expires_at).toLocaleDateString('it-IT')}
                  {daysRemaining !== null && daysRemaining < 0 && (
                    <span className="ml-2 text-sm">({Math.abs(daysRemaining)} giorni fa)</span>
                  )}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Piano di Rinnovo */}
        <Card className="border-2 border-blue-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl text-center">Piano Mensile Professionale</CardTitle>
            <CardDescription className="text-blue-100 text-center">
              Riprendi l'accesso completo ai servizi
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-gray-900 mb-2">€54<span className="text-lg text-gray-600">/mese</span></div>
              <p className="text-gray-600">Fatturazione mensile ricorrente</p>
            </div>

            {/* Benefici */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>1000 crediti per trascrizioni mensili (max 2000 cumulabili)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>Analisi del sentiment avanzata</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>Dashboard professionale completa</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>Cronologia sessioni illimitata</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>Supporto prioritario</span>
              </div>
            </div>

            {/* Pulsante Rinnovo */}
            <Button 
              onClick={handleRenewSubscription}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 text-lg"
              size="lg"
              disabled={isRenewing}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              {isRenewing ? 'Reindirizzamento...' : 'Rinnova Abbonamento'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Pagamento sicuro tramite Stripe • Cancella in qualsiasi momento
            </p>
          </CardContent>
        </Card>

        {/* Link di ritorno */}
        <div className="text-center mt-6">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')}
            className="text-gray-600"
          >
            Torna al Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
