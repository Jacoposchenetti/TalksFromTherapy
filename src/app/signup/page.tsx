"use client"

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Star, Zap } from "lucide-react"

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubscriptionSignup = () => {
    if (!email) {
      alert('Inserisci la tua email prima di procedere')
      return
    }
    
    // Salva l'email nel localStorage per il post-payment
    localStorage.setItem('pendingRegistrationEmail', email)
    
    // Apri Stripe checkout per abbonamento
    window.open(process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_LINK + `?prefilled_email=${encodeURIComponent(email)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Unisciti a TalksFromTherapy
          </h1>
          <p className="text-xl text-gray-600">
            Accesso esclusivo solo per abbonati premium
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Piano di abbonamento */}
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl text-blue-900">Piano Premium</CardTitle>
                  <CardDescription className="text-blue-700">
                    Accesso completo alla piattaforma
                  </CardDescription>
                </div>
                <Star className="h-8 w-8 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-blue-900">€54</div>
                <div className="text-gray-600">al mese</div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>1000 crediti ogni mese</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Analisi sentimenti illimitate</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Trascrizioni audio complete</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Dashboard avanzata</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Supporto prioritario</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Crediti cumulabili fino a 2000</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="la-tua-email@esempio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleSubscriptionSignup}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Inizia Abbonamento Premium
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info aggiuntive */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-800">✨ Accesso Immediato</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Dopo il pagamento riceverai immediatamente:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li>• Account attivato automaticamente</li>
                  <li>• 1000 crediti già disponibili</li>
                  <li>• Accesso a tutte le funzionalità</li>
                  <li>• Email di benvenuto con guida</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-blue-800">🔄 Gestione Flessibile</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Controlla il tuo abbonamento:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li>• Annulla in qualsiasi momento</li>
                  <li>• Nessun vincolo a lungo termine</li>
                  <li>• Fatturazione trasparente</li>
                  <li>• Supporto clienti dedicato</li>
                </ul>
              </CardContent>
            </Card>

            <div className="text-center">
              <Separator className="mb-4" />
              <p className="text-sm text-gray-500">
                Hai già un account?{' '}
                <button 
                  onClick={() => signIn()}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Accedi qui
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
