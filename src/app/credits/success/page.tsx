"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowLeft, Coins } from "lucide-react"

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [paymentInfo, setPaymentInfo] = useState<{
    type: string
    amount?: string
  } | null>(null)

  useEffect(() => {
    const type = searchParams.get('type')
    const amount = searchParams.get('amount')
    
    if (type) {
      setPaymentInfo({ type, amount: amount || undefined })
    }

    // Se è un nuovo abbonamento, controlla se c'è una registrazione pendente
    if (type === 'subscription') {
      const pendingEmail = localStorage.getItem('pendingRegistrationEmail')
      if (pendingEmail) {
        // Rimuovi l'email dal localStorage
        localStorage.removeItem('pendingRegistrationEmail')
        // L'account dovrebbe essere già stato creato dal webhook
        console.log('Account creato per:', pendingEmail)
      }
    }
  }, [searchParams])

  if (!session) {
    router.push('/login')
    return null
  }

  const getSuccessMessage = () => {
    if (!paymentInfo) return { title: 'Pagamento Completato!', description: 'Il tuo pagamento è stato elaborato con successo.' }
    
    if (paymentInfo.type === 'subscription') {
      return {
        title: '🎉 Abbonamento Attivato!',
        description: 'Il tuo abbonamento mensile è stato attivato. Riceverai 1000 crediti ogni mese.'
      }
    } else if (paymentInfo.type === 'credits' && paymentInfo.amount) {
      return {
        title: `🎉 ${paymentInfo.amount} Crediti Acquistati!`,
        description: `I tuoi ${paymentInfo.amount} crediti sono stati aggiunti al tuo account.`
      }
    }
    
    return { title: 'Pagamento Completato!', description: 'Il tuo pagamento è stato elaborato con successo.' }
  }

  const successMessage = getSuccessMessage()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-green-900">{successMessage.title}</CardTitle>
          <CardDescription className="text-center">
            {successMessage.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700">
              <strong>✨ Perfetto!</strong> I tuoi crediti sono stati aggiunti automaticamente al tuo account.
              Puoi iniziare subito ad utilizzare tutte le funzionalità AI.
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              <Coins className="h-4 w-4 mr-2" />
              Vai alla Dashboard
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => router.push('/credits')}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Visualizza i miei crediti
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
