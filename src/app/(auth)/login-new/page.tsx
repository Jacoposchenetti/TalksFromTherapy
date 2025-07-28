"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Mail } from "lucide-react"
import Link from "next/link"

function LoginNewPageInner() {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showResendEmail, setShowResendEmail] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Gestisci parametri URL
  useEffect(() => {
    const verified = searchParams.get('verified')
    const errorParam = searchParams.get('error')
    const message = searchParams.get('message')
    
    if (verified === 'true') {
      setError('') // Clear any errors
    }
    
    if (errorParam === 'verification_failed') {
      setError('Errore nella verifica email. Riprova o contatta il supporto.')
    }

    if (message) {
      // Mostra il messaggio per qualche secondo poi lo rimuove
      setTimeout(() => {
        const url = new URL(window.location.href)
        url.searchParams.delete('message')
        window.history.replaceState({}, '', url)
      }, 5000)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    setIsLoading(true)
    setError("")
    setShowResendEmail(false)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/dashboard')
      } else {
        setError(data.error || 'Errore durante il login')
        
        // Mostra opzione reinvio email se email non verificata
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setShowResendEmail(true)
        }
      }
    } catch (err) {
      setError('Errore di connessione. Riprova.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    try {
      // TODO: Implementare reinvio email
      alert('Funzionalità reinvio email in arrivo!')
    } catch (err) {
      console.error('Errore reinvio email:', err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Accedi al tuo account
          </h2>
        </div>

        {/* Messaggio successo verifica */}
        {searchParams.get('verified') === 'true' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✅ Email verificata con successo! Ora puoi accedere al tuo account.
            </AlertDescription>
          </Alert>
        )}

        {/* Messaggio generico */}
        {searchParams.get('message') && (
          <Alert className="bg-blue-50 border-blue-200">
            <Mail className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              {searchParams.get('message')}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Inserisci le tue credenziali per accedere
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {showResendEmail && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Non hai ancora verificato la tua email?{' '}
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      className="underline font-medium hover:no-underline"
                    >
                      Reinvia email di verifica
                    </button>
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Accesso in corso...' : 'Accedi'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <span className="text-sm text-gray-600">
                Non hai un account?{' '}
                <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                  Registrati
                </Link>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginNewPage() {
  return (
    <Suspense>
      <LoginNewPageInner />
    </Suspense>
  );
}