"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cookie, Settings, X, Shield, BarChart3, Target, Palette } from 'lucide-react'
import { useCookieConsent, type CookieConsent } from '@/hooks/use-cookie-consent'
import Link from 'next/link'

export default function CookieBanner() {
  const { consent, updateConsent, hasConsent, isLoading } = useCookieConsent()
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false
  })

  // Non mostrare nulla se stiamo caricando o se l'utente ha già dato il consenso
  if (isLoading || hasConsent) return null

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true
    }
    updateConsent(allAccepted)
  }

  const acceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false
    }
    updateConsent(necessaryOnly)
  }

  const saveCustomPreferences = () => {
    updateConsent(preferences)
    setShowSettings(false)
  }

  const cookieTypes = [
    {
      key: 'necessary' as keyof typeof preferences,
      title: 'Cookie Necessari',
      description: 'Essenziali per il funzionamento del sito (autenticazione, sicurezza, sessioni).',
      icon: Shield,
      required: true
    },
    {
      key: 'analytics' as keyof typeof preferences,
      title: 'Cookie Analitici',
      description: 'Ci aiutano a capire come utilizzi il sito per migliorare l\'esperienza utente.',
      icon: BarChart3,
      required: false
    },
    {
      key: 'functional' as keyof typeof preferences,
      title: 'Cookie Funzionali',
      description: 'Ricordano le tue preferenze (tema, impostazioni audio, lingua).',
      icon: Palette,
      required: false
    },
    {
      key: 'marketing' as keyof typeof preferences,
      title: 'Cookie Marketing',
      description: 'Utilizzati per mostrare contenuti e pubblicità personalizzata.',
      icon: Target,
      required: false
    }
  ]

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t-2 border-blue-200 shadow-2xl">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-full">
              <Cookie className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                Utilizziamo i cookie per migliorare la tua esperienza
              </h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                TalksFromTherapy utilizza cookie essenziali per il funzionamento del servizio di trascrizione 
                e cookie analitici (opzionali) per migliorare l'esperienza utente. I tuoi dati clinici sono 
                sempre crittografati e protetti.{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline font-medium">
                  Leggi la Privacy Policy completa →
                </Link>
              </p>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={acceptAll} 
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  Accetta tutti
                </Button>
                <Button 
                  onClick={acceptNecessary} 
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  Solo necessari
                </Button>
                <Button 
                  onClick={() => setShowSettings(true)} 
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-800"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Personalizza
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-600" />
                    Preferenze Cookie
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Scegli quali cookie accettare per personalizzare la tua esperienza
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowSettings(false)}
                  className="hover:bg-white/50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-6">
                {cookieTypes.map((cookieType) => {
                  const IconComponent = cookieType.icon
                  return (
                    <div key={cookieType.key} className="border rounded-lg p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-full">
                              <IconComponent className="h-4 w-4 text-blue-600" />
                            </div>
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                              {cookieType.title}
                              {cookieType.required && (
                                <Badge variant="secondary" className="text-xs">Obbligatorio</Badge>
                              )}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-3 ml-11">
                            {cookieType.description}
                          </p>
                          <div className="ml-11">
                            <details className="text-xs text-gray-500">
                              <summary className="cursor-pointer hover:text-gray-700 font-medium">
                                Esempi di cookie utilizzati
                              </summary>
                              <ul className="mt-2 space-y-1 ml-4">
                                {cookieType.examples.map((example, index) => (
                                  <li key={index} className="list-disc">{example}</li>
                                ))}
                              </ul>
                            </details>
                          </div>
                        </div>
                        <div className="ml-4 flex items-center">
                          <input 
                            type="checkbox" 
                            checked={preferences[cookieType.key]}
                            disabled={cookieType.required}
                            onChange={(e) => setPreferences(prev => ({
                              ...prev, 
                              [cookieType.key]: e.target.checked
                            }))}
                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3 mt-8 pt-6 border-t">
                <Button 
                  onClick={saveCustomPreferences} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Salva preferenze
                </Button>
                <Button 
                  onClick={acceptAll} 
                  variant="outline" 
                  className="flex-1"
                >
                  Accetta tutti
                </Button>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center">
                Puoi modificare queste preferenze in qualsiasi momento dalle impostazioni del tuo account.
                Il consenso viene richiesto ogni 12 mesi per compliance GDPR.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
