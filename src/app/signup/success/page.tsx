'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react'

interface RegistrationData {
  name: string
  email: string
  password: string
  licenseNumber?: string
  termsAccepted: boolean
  privacyAccepted: boolean
}

export default function SignupSuccess() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string>('')
  const [creditsAdded, setCreditsAdded] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const createAccount = async () => {
      try {
        // Previeni doppia esecuzione
        if (isProcessing) {
          console.log('Account creation already in progress, skipping...')
          return
        }
        
        setIsProcessing(true)
        
        // Verifica che siamo sul client
        if (typeof window === 'undefined') return
        
        // Verifica che il pagamento sia stato completato
        const sessionId = searchParams.get('session_id')
        if (!sessionId) {
          throw new Error('ID sessione mancante')
        }

        // Recupera i dati di registrazione dal localStorage
        const registrationDataStr = localStorage.getItem('registrationData')
        if (!registrationDataStr) {
          throw new Error('Dati di registrazione non trovati')
        }

        const registrationData: RegistrationData = JSON.parse(registrationDataStr)

        // Verifica che tutti i dati necessari siano presenti
        if (!registrationData.email || !registrationData.password || !registrationData.name) {
          throw new Error('Dati di registrazione incompleti')
        }

        console.log('Creating account for:', registrationData.email)

        // USA IL METODO ORIGINALE CHE FUNZIONAVA
        const response = await fetch('/api/account/create-original', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: registrationData.email,
            password: registrationData.password,
            name: registrationData.name,
            licenseNumber: registrationData.licenseNumber || null,
            sessionId: sessionId
          })
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          console.error('Account creation error:', result.error)
          throw new Error(`Errore nella creazione dell'account: ${result.error}`)
        }

        console.log('Account created successfully:', result.user_id)

        // L'API ha già gestito i crediti e la configurazione, account pronto!
        setCreditsAdded(result.credits_added || 0)

        // Pulisci il localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('registrationData')
        }

        setStatus('success')

        // Reindirizza al dashboard dopo 3 secondi
        setTimeout(() => {
          router.push('/dashboard')
        }, 3000)

      } catch (err) {
        console.error('Account creation error:', err)
        setError(err instanceof Error ? err.message : 'Errore sconosciuto')
        setStatus('error')
        setIsProcessing(false) // Reset per permettere retry
      }
    }

    createAccount()
  }, [searchParams, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Creazione Account
          </h1>
          <p className="text-gray-600">
            Stiamo configurando il tuo account professionale...
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Errore nella Creazione
          </h1>
          <p className="text-gray-600 mb-4">
            {error}
          </p>
          <button
            onClick={() => router.push('/signup')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Riprova Registrazione
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 text-center">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Account Creato con Successo!
        </h1>
        <p className="text-gray-600 mb-4">
          Il tuo account professionale è stato configurato. Sarai reindirizzato al dashboard tra pochi secondi.
        </p>
        <div className="text-sm text-gray-500">
          {creditsAdded > 0 ? `${creditsAdded} crediti aggiunti al tuo account` : 'Account già al massimo di crediti (2000)'}
        </div>
      </div>
    </div>
  )
}
