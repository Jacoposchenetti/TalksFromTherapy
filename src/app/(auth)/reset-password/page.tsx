"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    console.log("Reset form submitted with email:", email)

    if (!email) {
      setError("Inserisci la tua email")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Formato email non valido")
      return
    }

    setIsLoading(true)
    console.log("Sending reset request...")

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      console.log("Response status:", response.status)
      const data = await response.json()
      console.log("Response data:", data)

      if (response.ok) {
        setSuccess(data.message || "Ti è stato inviato un link per il reset della password. Controlla la tua email!")
        setEmail("") // Clear form
      } else {
        if (response.status === 429) {
          setError("Troppi tentativi. Riprova tra 15 minuti.")
        } else {
          setError(data.error || "Errore durante l'invio dell'email")
        }
      }
    } catch (error) {
      console.error("Reset password error:", error)
      setError("Errore durante la richiesta di reset password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Reimposta Password
          </CardTitle>
          <CardDescription className="text-center">
            Inserisci la tua email per ricevere il link di reset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your-email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Invio in corso..." : "Invia Link Reset"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm space-y-2">
            <div>
              <Link 
                href="/login" 
                className="font-medium text-primary hover:text-primary/80"
              >
                ← Torna al Login
              </Link>
            </div>
            <div>
              <span className="text-gray-600">Non hai un account? </span>
              <Link 
                href="/register" 
                className="font-medium text-primary hover:text-primary/80"
              >
                Registrati
              </Link>
            </div>
          </div>

          {success && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                💡 <strong>Cosa fare ora:</strong><br/>
                1. Controlla la tua email (anche spam)<br/>
                2. Clicca sul link ricevuto da noreply@talksfromtherapy.com<br/>
                3. Imposta una nuova password sicura
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
