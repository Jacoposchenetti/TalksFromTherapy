"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Settings, Cookie, Save, RefreshCw } from 'lucide-react'
import { useCookieConsent } from '@/hooks/use-cookie-consent'

export default function CookieSettings() {
  const { consent, updateConsent, resetConsent, hasConsent } = useCookieConsent()
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: consent?.analytics ?? false,
    marketing: consent?.marketing ?? false,
    functional: consent?.functional ?? false
  })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    setIsSaving(true)
    updateConsent(preferences)
    setMessage('Preferenze salvate con successo!')
    setTimeout(() => setMessage(''), 3000)
    setIsSaving(false)
  }

  const handleReset = () => {
    resetConsent()
    setPreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false
    })
    setMessage('Preferenze ripristinate. Ricarica la pagina per vedere il banner cookie.')
    setTimeout(() => setMessage(''), 5000)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2">
          <Cookie className="h-5 w-5 text-blue-600" />
          Gestione Cookie
        </CardTitle>
        <p className="text-sm text-gray-600">
          Controlla quali cookie utilizziamo per migliorare la tua esperienza
        </p>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {message && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm">
            {message}
          </div>
        )}

        {hasConsent && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800 text-sm">
              <strong>Consenso attivo dal:</strong> {new Date(consent?.timestamp || '').toLocaleDateString('it-IT')}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Necessary Cookies */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">Cookie Necessari</h3>
                <Badge variant="secondary" className="text-xs">Obbligatorio</Badge>
              </div>
              <p className="text-sm text-gray-600">
                Essenziali per autenticazione e sicurezza del sito
              </p>
            </div>
            <Switch checked disabled />
          </div>

          {/* Analytics Cookies */}
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <h3 className="font-medium">Cookie Analitici</h3>
              <p className="text-sm text-gray-600">
                Statistiche anonime per migliorare il servizio
              </p>
            </div>
            <Switch 
              checked={preferences.analytics}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, analytics: checked }))}
            />
          </div>

          {/* Functional Cookies */}
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <h3 className="font-medium">Cookie Funzionali</h3>
              <p className="text-sm text-gray-600">
                Ricordano le tue preferenze (tema, impostazioni)
              </p>
            </div>
            <Switch 
              checked={preferences.functional}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, functional: checked }))}
            />
          </div>

          {/* Marketing Cookies */}
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <h3 className="font-medium">Cookie Marketing</h3>
              <p className="text-sm text-gray-600">
                Contenuti personalizzati (attualmente non utilizzati)
              </p>
            </div>
            <Switch 
              checked={preferences.marketing}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, marketing: checked }))}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salva Preferenze
              </>
            )}
          </Button>
          <Button 
            onClick={handleReset} 
            variant="outline"
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-2" />
            Ripristina
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Le modifiche hanno effetto immediato</p>
          <p>• Il consenso viene richiesto ogni 12 mesi per compliance GDPR</p>
          <p>• I cookie necessari non possono essere disabilitati</p>
        </div>
      </CardContent>
    </Card>
  )
}
