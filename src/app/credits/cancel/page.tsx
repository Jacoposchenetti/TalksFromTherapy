"use client"

import { useRouter } from 'next/navigation'
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle, ArrowLeft, CreditCard } from "lucide-react"

export default function PaymentCancelPage() {
  const router = useRouter()
  const { data: session } = useSession()

  if (!session) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-red-900">Pagamento Annullato</CardTitle>
          <CardDescription className="text-center">
            Il pagamento è stato annullato. Nessun addebito è stato effettuato.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-700">
              Puoi riprovare in qualsiasi momento dalla pagina dei crediti.
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => router.push('/credits')}
              className="w-full"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Riprova il pagamento
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna alla Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
