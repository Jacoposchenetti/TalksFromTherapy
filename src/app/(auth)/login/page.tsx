"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [showResendOption, setShowResendOption] = useState(false)
  const router = useRouter()
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")
    setShowResendOption(false)

    try {
      console.log("Login attempt started...")
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      console.log("SignIn result:", result)

      if (result?.error) {
        console.error("Login error:", result.error)
        
        // Mostra opzione resend se email non verificata
        if (result.error.includes("Email not verified") || result.error.includes("email non verificata")) {
          setError("La tua email non è ancora verificata. Controlla la tua casella di posta.")
          setShowResendOption(true)
        } else {
          setError("Email o password non valide")
        }
      } else if (result?.ok) {
        console.log("Login successful, redirecting...")
        router.push("/dashboard")
        router.refresh()
      } else {
        console.error("Unexpected login result:", result)
        setError("Si è verificato un errore imprevisto")
      }
    } catch (error) {
      console.error("Login exception:", error)
      setError("Si è verificato un errore durante il login")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!email) {
      setError("Inserisci la tua email per ricevere l'email di verifica")
      return
    }

    setIsResending(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message || "Email di verifica inviata!")
        setShowResendOption(false)
      } else {
        setError(data.error || "Errore durante l'invio dell'email")
      }
    } catch (error) {
      setError("Errore durante l'invio dell'email di verifica")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            TalksFromTherapy
          </CardTitle>
          <CardDescription className="text-center">
            Log in to your account to continue
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
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            {showResendOption && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 mb-2">
                  Non hai ricevuto l'email di verifica?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  {isResending ? "Invio in corso..." : "Invia di nuovo email di verifica"}
                </Button>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || isResending}
            >
              {isLoading ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Non hai un account? </span>
            <Link 
              href="/register" 
              className="font-medium text-primary hover:text-primary/80"
            >
              Registrati qui
            </Link>
          </div>

          <div className="mt-4 text-center text-sm">
            <Link 
              href="/auth/reset-password" 
              className="text-gray-600 hover:text-gray-800"
            >
              Password dimenticata?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
