"use client"

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle, Star, Zap } from "lucide-react"
import Link from "next/link"
import { getStripe } from "@/lib/stripe"

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    licenseNumber: '',
    acceptTerms: false,
    acceptPrivacy: false
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Rimuovi l'errore quando l'utente inizia a digitare
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleCheckboxChange = (name, checked) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }))
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Il nome è obbligatorio'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email è obbligatoria'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato email non valido'
    }

    if (!formData.password) {
      newErrors.password = 'La password è obbligatoria'
    } else if (formData.password.length < 8) {
      newErrors.password = 'La password deve essere di almeno 8 caratteri'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Le password non coincidono'
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Devi accettare i termini di servizio'
    }

    if (!formData.acceptPrivacy) {
      newErrors.acceptPrivacy = 'Devi accettare la privacy policy'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubscriptionSignup = async () => {
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      // Salva i dati nel localStorage per recuperarli dopo il pagamento
      if (typeof window !== 'undefined') {
        localStorage.setItem('registrationData', JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          licenseNumber: formData.licenseNumber,
          termsAccepted: formData.acceptTerms,
          privacyAccepted: formData.acceptPrivacy,
          timestamp: Date.now()
        }))
      }

      // Crea il link di pagamento Stripe
      const stripe = await getStripe()
      if (!stripe) throw new Error('Stripe non caricato')

      // Reindirizza a Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        lineItems: [
          {
            price: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'price_1QIzTPIvCOcSRSrLZKHpDRVG', // ID del tuo piano mensile
            quantity: 1,
          },
        ],
        mode: 'subscription',
        successUrl: `${window.location.origin}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/signup`,
        customerEmail: formData.email,
      })

      if (error) {
        console.error('Stripe error:', error)
        throw new Error(error.message || 'Errore nel processo di pagamento')
      }
    } catch (error) {
      console.error('Subscription signup error:', error)
      alert(`Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
    } finally {
      setIsLoading(false)
    }
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
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Il tuo nome completo"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="la-tua-email@esempio.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="licenseNumber">Numero Albo Professionale (opzionale)</Label>
                  <Input
                    id="licenseNumber"
                    name="licenseNumber"
                    type="text"
                    placeholder="Es. 12345"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Almeno 8 caratteri"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Conferma Password *</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Ripeti la password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      id="acceptTerms"
                      checked={formData.acceptTerms}
                      onCheckedChange={(checked) => handleCheckboxChange('acceptTerms', checked)}
                      className="mt-1 flex-shrink-0"
                    />
                    <div className="text-sm leading-relaxed">
                      Accetto i <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">Termini di Servizio</Link> e autorizzo il trattamento dei miei dati professionali per fornire il servizio di trascrizione.
                    </div>
                  </div>
                  {errors.acceptTerms && <p className="text-red-500 text-sm">{errors.acceptTerms}</p>}

                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      id="acceptPrivacy"
                      checked={formData.acceptPrivacy}
                      onCheckedChange={(checked) => handleCheckboxChange('acceptPrivacy', checked)}
                      className="mt-1 flex-shrink-0"
                    />
                    <div className="text-sm leading-relaxed">
                      Ho letto e accetto la <Link href="/privacy" className="text-blue-600 hover:text-blue-800 underline">Privacy Policy</Link> e consento al trattamento dei dati personali per i servizi di trascrizione terapeutica.
                    </div>
                  </div>
                  {errors.acceptPrivacy && <p className="text-red-500 text-sm">{errors.acceptPrivacy}</p>}
                </div>

                <Button 
                  onClick={handleSubscriptionSignup}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                  disabled={isLoading}
                >
                  <Zap className="h-5 w-5 mr-2" />
                  {isLoading ? 'Elaborazione...' : 'Procedi al Pagamento'}
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
