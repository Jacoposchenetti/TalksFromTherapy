"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CreditCard, Calendar, X } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface SubscriptionManagerProps {
  subscription?: {
    status: 'active' | 'canceled' | 'past_due'
    current_period_end: string
    cancel_at_period_end: boolean
  }
  onCancel?: () => void
}

export default function SubscriptionManager({ subscription, onCancel }: SubscriptionManagerProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleCancelSubscription = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        alert('Abbonamento annullato con successo. Rimarrà attivo fino alla fine del periodo corrente.')
        onCancel?.()
      } else {
        alert('Errore nell\'annullamento dell\'abbonamento. Contatta il supporto.')
      }
    } catch (error) {
      alert('Errore nell\'annullamento dell\'abbonamento. Contatta il supporto.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stato Abbonamento
          </CardTitle>
          <CardDescription>
            Non hai un abbonamento attivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => window.open(process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_LINK, '_blank')}
            className="w-full"
          >
            Attiva Abbonamento Premium
          </Button>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Attivo</Badge>
      case 'canceled':
        return <Badge variant="secondary">Annullato</Badge>
      case 'past_due':
        return <Badge variant="destructive">In scadenza</Badge>
      default:
        return <Badge variant="outline">Sconosciuto</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Abbonamento Premium
          </div>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Gestisci il tuo abbonamento mensile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Piano</p>
            <p className="font-medium">Premium - €54/mese</p>
          </div>
          <div>
            <p className="text-muted-foreground">Prossimo rinnovo</p>
            <p className="font-medium">{formatDate(subscription.current_period_end)}</p>
          </div>
        </div>

        {subscription.cancel_at_period_end && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              L'abbonamento si concluderà il {formatDate(subscription.current_period_end)}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          {subscription.status === 'active' && !subscription.cancel_at_period_end && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Annulla Abbonamento
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Annullare l'abbonamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    L'abbonamento rimarrà attivo fino al {formatDate(subscription.current_period_end)}.
                    Dopo quella data perderai l'accesso alla piattaforma.
                    <br /><br />
                    <strong>Cosa succede quando annulli:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• I crediti rimanenti scadranno</li>
                      <li>• Non potrai più accedere alle funzionalità</li>
                      <li>• I dati rimarranno salvati per 30 giorni</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Mantieni Abbonamento</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleCancelSubscription}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isLoading ? 'Annullamento...' : 'Conferma Annullamento'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button variant="outline" className="flex-1">
            <Calendar className="h-4 w-4 mr-2" />
            Storico Fatture
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
