"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function ResetPasswordConfirmPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)
  const [tokens, setTokens] = useState<{accessToken: string | null, refreshToken: string | null}>({
    accessToken: null,
    refreshToken: null
  })
  
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Debug SUPER completo
    console.log('🔍 URL Search Params:', Object.fromEntries(searchParams.entries()))
    console.log('🔍 Full URL:', window.location.href)
    console.log('🔍 URL Hash:', window.location.hash)
    console.log('🔍 Window location:', {
      href: window.location.href,
      search: window.location.search,
      hash: window.location.hash,
      pathname: window.location.pathname
    })
    
    // Controlla se abbiamo i parametri necessari per il reset
    let accessToken = searchParams.get('access_token') || searchParams.get('token')
    let refreshToken = searchParams.get('refresh_token')
    let type = searchParams.get('type')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    console.log('🔍 Parametri estratti inizialmente:', {
      accessToken: accessToken ? `${accessToken.substring(0, 30)}...` : 'NULL',
      accessTokenFull: accessToken || 'NULL',
      accessTokenLength: accessToken?.length || 0,
      refreshToken: refreshToken ? `${refreshToken.substring(0, 30)}...` : 'NULL',
      refreshTokenLength: refreshToken?.length || 0,
      type,
      error,
      errorDescription
    })
    
    // Se non troviamo i parametri negli URL params, controlliamo nell'hash
    if (!accessToken && window.location.hash) {
      console.log('🔍 Checking URL hash for params...')
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      console.log('🔍 Hash params:', Object.fromEntries(hashParams.entries()))
      
      accessToken = hashParams.get('access_token') || hashParams.get('token')
      refreshToken = refreshToken || hashParams.get('refresh_token')
      type = type || hashParams.get('type')
    }
    
    // Salva i tokens nello state
    setTokens({ accessToken, refreshToken })
    
    // Debug dettagliato
    console.log('🔍 Reset password params dopo check:', {
      accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
      accessTokenLength: accessToken?.length || 0,
      refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : null,
      refreshTokenLength: refreshToken?.length || 0,
      type,
      error,
      errorDescription,
      searchParams: Object.fromEntries(searchParams.entries()),
      hashPresent: !!window.location.hash
    })
    
    if (error) {
      setIsValidToken(false)
      let errorMessage = `❌ Errore da Supabase: ${errorDescription || error}`
      
      // Messaggi di errore più specifici
      if (error === 'access_denied' && errorDescription?.includes('expired')) {
        errorMessage = `⏰ Il link di reset password è scaduto. I link sono validi solo per 1 ora. 
        
📧 Per risolvere:
1. Torna alla pagina di reset password
2. Inserisci nuovamente la tua email 
3. Controlla l'email più recente
4. Clicca sul nuovo link entro 1 ora`
      } else if (error === 'access_denied') {
        errorMessage = `🔒 Link di reset password non valido o già utilizzato.
        
📧 Per risolvere:
1. Torna alla pagina di reset password
2. Richiedi un nuovo link
3. Usa il link più recente ricevuto`
      }
      
      setError(errorMessage)
      console.error('🚨 Supabase error:', { error, errorDescription })
      return
    }
    
    // Accetta token anche senza type=recovery per compatibilità
    if (accessToken) {
      console.log('✅ Token valido ricevuto', { 
        type, 
        hasToken: !!accessToken,
        tokenLength: accessToken.length,
        tokenStart: accessToken.substring(0, 20)
      })
      setIsValidToken(true)
    } else {
      setIsValidToken(false)
      console.error('❌ NESSUN TOKEN TROVATO!')
      console.error('❌ Debug completo:', {
        searchParamsKeys: Array.from(searchParams.keys()),
        searchParamsValues: Object.fromEntries(searchParams.entries()),
        urlSearch: window.location.search,
        urlHash: window.location.hash,
        accessTokenFromSearch: searchParams.get('access_token'),
        tokenFromSearch: searchParams.get('token')
      })
      
      setError(`❌ Token mancante! 
      
🔍 URL attuale: ${window.location.href}
🔍 Parametri trovati: ${Array.from(searchParams.keys()).join(', ') || 'NESSUNO'}

📧 Il link nell'email potrebbe essere danneggiato. Prova a:
1. Richiedere un nuovo link di reset
2. Copiare e incollare l'intero link dall'email`)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // Validazioni
    if (!password || !confirmPassword) {
      setError("Tutti i campi sono obbligatori")
      return
    }

    if (password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri")
      return
    }

    if (password !== confirmPassword) {
      setError("Le password non coincidono")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          password,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Password aggiornata con successo!")
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        setError(data.error || "Errore durante l'aggiornamento della password")
      }
    } catch (error) {
      setError("Errore durante l'aggiornamento della password")
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">Verifica del link in corso...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-red-600">
              Link Non Valido
            </CardTitle>
            <CardDescription className="text-center">
              Il link di reset password è scaduto o non valido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {error || "Il link di reset password è scaduto o non valido. Richiedi un nuovo reset password."}
              </AlertDescription>
            </Alert>
            
            <div className="mt-6 text-center space-y-2">
              <Button asChild className="w-full">
                <Link href="/reset-password">
                  Richiedi Nuovo Reset
                </Link>
              </Button>
              <div>
                <Link 
                  href="/login" 
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  ← Torna al Login
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Imposta Nuova Password
          </CardTitle>
          <CardDescription className="text-center">
            Inserisci la tua nuova password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nuova Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
              <p className="text-xs text-gray-500">
                Minimo 8 caratteri
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Conferma Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>
                  {success}
                  <br />
                  <span className="text-sm">Reindirizzamento al login...</span>
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Aggiornamento..." : "Aggiorna Password"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link 
              href="/login" 
              className="text-gray-600 hover:text-gray-800"
            >
              ← Torna al Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
