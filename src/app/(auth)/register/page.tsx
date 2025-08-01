"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { CheckCircle, CreditCard, Star, Sparkles } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()

  // Reindirizza alla pagina di abbonamento (manteniamo questa funzionalità)
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/signup')
    }, 500)
    
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Benvenuto in TalksFromTherapy
          </h1>
          <p className="text-xl text-gray-600">
            La piattaforma professionale per psicoterapeuti
          </p>
        </div>
      </div>
      
        <div className="grid md:grid-cols-2 gap-8">
          {/* Piano di abbonamento */}
          <Card className="border-2 border-blue-200 shadow-lg transform transition-all duration-300 hover:scale-105">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Piano Premium</CardTitle>
                  <CardDescription className="text-blue-100">
                    Accesso completo alla piattaforma
                  </CardDescription>
                </div>
                <Star className="h-8 w-8 text-yellow-300" />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-blue-900">€54</div>
                <div className="text-gray-600">al mese</div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>1000 crediti ogni mese</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Analisi sentimenti illimitate</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Trascrizioni audio complete</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Dashboard avanzata</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Supporto prioritario</span>
                </div>
              </div>

              <Button 
                onClick={() => router.push('/signup')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Attiva Abbonamento Premium
              </Button>
            </CardContent>
          </Card>

          {/* Info aggiuntive */}
          <div className="space-y-6">
            <Card className="bg-white bg-opacity-80 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <Sparkles className="h-5 w-5 mr-2 text-green-600" />
                  Accesso Immediato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Con l'abbonamento riceverai immediatamente:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600 mr-2"></span>
                    Account attivato automaticamente
                  </li>
                  <li className="flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600 mr-2"></span>
                    1000 crediti già disponibili
                  </li>
                  <li className="flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600 mr-2"></span>
                    Accesso a tutte le funzionalità AI
                  </li>
                  <li className="flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600 mr-2"></span>
                    Email di benvenuto con guida
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white bg-opacity-80 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-800">
                  <Star className="h-5 w-5 mr-2 text-blue-600" />
                  Gestione Flessibile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Il tuo abbonamento include:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></span>
                    Annullamento in qualsiasi momento
                  </li>
                  <li className="flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></span>
                    Nessun vincolo a lungo termine
                  </li>
                  <li className="flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></span>
                    Fatturazione trasparente
                  </li>
                  <li className="flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></span>
                    Supporto clienti dedicato
                  </li>
                </ul>
              </CardContent>
            </Card>

            <div className="text-center mt-6">
              <p className="text-sm text-gray-500">
                Hai già un account?{' '}
                <Link 
                  href="/login" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Accedi qui
                </Link>
              </p>
            </div>
        </div>
      </div>
    </div>
  )
}