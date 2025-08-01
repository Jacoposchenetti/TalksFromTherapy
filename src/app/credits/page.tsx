"use client"

import { useEffect } from 'react'
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Coins, History, TrendingUp, ArrowLeft, CreditCard, Gift } from "lucide-react"
import { useCredits } from "@/hooks/useCredits"
import { CREDIT_COSTS, CREDIT_PACKAGES } from "@/lib/credits-config"
import SubscriptionManager from "@/components/subscription-manager"

export default function CreditsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { credits, transactions, stats, loading, refresh } = useCredits()

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
  }, [session, status, router])

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Caricamento crediti...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Gestione Crediti</h1>
          <p className="text-gray-600">Monitora e gestisci i tuoi crediti per le funzionalità AI</p>
        </div>

        {/* Gestione Abbonamento */}
        <div className="mb-8">
          <SubscriptionManager 
            subscription={{
              status: 'active',
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              cancel_at_period_end: false
            }}
            onCancel={() => refresh()}
          />
        </div>

        {/* Saldo attuale e statistiche */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Crediti Disponibili</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{credits?.credits_balance || 0}</div>
              <p className="text-xs text-muted-foreground">
                Reset il {credits?.last_reset_date ? new Date(credits.last_reset_date).toLocaleDateString() : '-'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilizzo Mensile</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.monthlyUsage || 0}</div>
              <p className="text-xs text-muted-foreground">Crediti usati questo mese</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Utilizzato</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsed || 0}</div>
              <p className="text-xs text-muted-foreground">Dalla registrazione</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Feature Preferita</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {stats?.mostUsedFeature ? 
                  stats.mostUsedFeature.replace('_', ' ').toLowerCase() : 
                  'Nessuna'
                }
              </div>
              <p className="text-xs text-muted-foreground">Più utilizzata</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Costi delle funzionalità */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Costi Funzionalità
              </CardTitle>
              <CardDescription>
                Crediti necessari per ogni operazione
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(CREDIT_COSTS).map(([feature, cost]) => {
                const featureNames = {
                  TRANSCRIPTION: 'Trascrizione completa',
                  TOPIC_MODELLING: 'Topic modelling automatico',
                  CUSTOM_TOPIC_MODELLING: 'Topic modelling personalizzato',
                  SENTIMENT_ANALYSIS: 'Analisi sentiment',
                  SEMANTIC_FRAME: 'Semantic frame',
                  AI_INSIGHTS: 'AI insights avanzati',
                  DOCUMENT_ANALYSIS: 'Analisi documento'
                }
                
                return (
                  <div key={feature} className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {featureNames[feature as keyof typeof featureNames] || feature}
                    </span>
                    <Badge variant="secondary">{cost} {cost === 1 ? 'credito' : 'crediti'}</Badge>
                  </div>
                )
              })}
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Esempio di utilizzo mensile:</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>• 80 trascrizioni = 400 crediti</div>
                  <div>• 80 topic modelling = 80 crediti</div>
                  <div>• 220 topic personalizzati = 220 crediti</div>
                  <div>• 80 sentiment analysis = 80 crediti</div>
                  <div>• 220 semantic frames = 220 crediti</div>
                  <div className="font-medium pt-2 border-t border-blue-200">
                    Totale: 1000 crediti/mese
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pacchetti crediti acquistabili */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Acquista Crediti Extra
              </CardTitle>
              <CardDescription>
                Pacchetti aggiuntivi per quando finisci i crediti mensili
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Abbonamento Mensile */}
              <div className="flex items-center justify-between p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                <div>
                  <h3 className="font-medium text-blue-900">🔄 Abbonamento Mensile</h3>
                  <p className="text-sm text-blue-700">1000 crediti ogni mese (si accumulano fino a 2000)</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-900">€54/mese</p>
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => window.open(process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_LINK, '_blank')}
                  >
                    Abbonati
                  </Button>
                </div>
              </div>

              {/* Pacchetti One-Time */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">💰 Pacchetto Base</h3>
                    <p className="text-sm text-muted-foreground">300 crediti</p>
                  </div>
                  <div className="mt-3">
                    <p className="font-bold">€8</p>
                    <Button 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => window.open(process.env.NEXT_PUBLIC_STRIPE_CREDITS_300_LINK, '_blank')}
                    >
                      Acquista
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">⭐ Pacchetto Standard</h3>
                    <p className="text-sm text-muted-foreground">700 crediti</p>
                  </div>
                  <div className="mt-3">
                    <p className="font-bold">€17</p>
                    <Button 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => window.open(process.env.NEXT_PUBLIC_STRIPE_CREDITS_700_LINK, '_blank')}
                    >
                      Acquista
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col justify-between p-4 border-2 border-green-200 rounded-lg bg-green-50">
                  <div>
                    <h3 className="font-medium text-green-900">🚀 Pacchetto Premium</h3>
                    <p className="text-sm text-green-700">1500 crediti</p>
                    <Badge variant="secondary" className="mt-1 bg-green-200 text-green-800">Migliore offerta</Badge>
                  </div>
                  <div className="mt-3">
                    <p className="font-bold text-green-900">€30</p>
                    <Button 
                      size="sm" 
                      className="w-full mt-2 bg-green-600 hover:bg-green-700"
                      onClick={() => window.open(process.env.NEXT_PUBLIC_STRIPE_CREDITS_1500_LINK, '_blank')}
                    >
                      Acquista
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Storico transazioni */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Storico Transazioni
            </CardTitle>
            <CardDescription>
              Le tue ultime operazioni con i crediti
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessuna transazione trovata
              </p>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 10).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleString()}
                        {transaction.feature_used && ` • ${transaction.feature_used}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={transaction.amount > 0 ? "default" : "secondary"}
                        className={transaction.amount > 0 ? "bg-green-100 text-green-800" : ""}
                      >
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount} crediti
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {transaction.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
