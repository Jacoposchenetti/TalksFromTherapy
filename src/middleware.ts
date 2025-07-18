import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  async function middleware(req) {
    // GLOBAL BLOCK MODE - Blocca tutto se abilitato
    if (process.env.GLOBAL_BLOCK_MODE === 'true') {
      return new NextResponse('Sistema temporaneamente non disponibile', { status: 503 })
    }

    // BASIC RATE LIMITING - Fallback se il database non è disponibile
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const timeWindow = 60 * 1000 // 1 minuto
    const maxRequests = 100 // Max 100 richieste per minuto per IP
    
    // Simple in-memory rate limiting
    if (!global.rateLimitStore) {
      global.rateLimitStore = new Map()
    }
    
    const ipData = global.rateLimitStore.get(ip) || { count: 0, resetTime: now + timeWindow }
    
    if (now > ipData.resetTime) {
      ipData.count = 1
      ipData.resetTime = now + timeWindow
    } else {
      ipData.count++
    }
    
    global.rateLimitStore.set(ip, ipData)
    
    // Block if rate limit exceeded
    if (ipData.count > maxRequests) {
      return new NextResponse('Rate limit exceeded', { status: 429 })
    }

    // Cleanup old entries periodically
    if (Math.random() < 0.01) { // 1% chance per request
      const cutoff = now - timeWindow
      for (const [key, value] of global.rateLimitStore.entries()) {
        if (value.resetTime < cutoff) {
          global.rateLimitStore.delete(key)
        }
      }
    }

    // MIDDLEWARE GLOBALE - Blocca completamente il sito quando attivato
    if (process.env.GLOBAL_BLOCK_MODE === 'true') {
      return new NextResponse(
        `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sito Temporaneamente Non Disponibile</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 500px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1.5rem;
      display: block;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      font-weight: 700;
    }
    p {
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
      opacity: 0.9;
    }
    .small {
      font-size: 0.9rem;
      opacity: 0.7;
      margin-top: 1.5rem;
    }
    .pulse {
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon pulse">🔒</div>
    <h1>Sito Temporaneamente Offline</h1>
    <p>Stiamo effettuando importanti aggiornamenti di sicurezza</p>
    <p>Il servizio sarà ripristinato a breve</p>
    <div class="small">
      Ci scusiamo per l'inconveniente
    </div>
  </div>
</body>
</html>`,
        {
          status: 503,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Retry-After': '3600',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
        }
      )
    }
    
    // Se non è in modalità blocco globale, continua con la logica normale
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Public routes che non richiedono autenticazione
        const publicRoutes = ["/", "/login", "/register"]
        
        // API routes che usano la propria autenticazione (non NextAuth)
        const customAuthApiRoutes = [
          "/api/emotion-analysis",
          "/api/sentiment",
          "/api/transcribe", 
          "/api/sessions",
          "/api/notes",
          "/api/patients",
          "/api/analyses"
        ]
        
        // Controlla se la route è pubblica
        const isPublicRoute = publicRoutes.some(route => 
          pathname === route || pathname.startsWith(route + "/")
        )
        
        // Controlla se è un'API con autenticazione custom
        const isCustomAuthApi = customAuthApiRoutes.some(route => 
          pathname.startsWith(route)
        )
        
        // Debug log per le API delle note
        if (pathname.includes('/note') || pathname.includes('/sessions/')) {
          console.log('Middleware debug:', {
            pathname,
            isCustomAuthApi,
            token: !!token,
            matchedRoute: customAuthApiRoutes.find(route => pathname.startsWith(route))
          })
        }
        
        // Se la route è pubblica o usa autenticazione custom, permettila sempre
        if (isPublicRoute || isCustomAuthApi) {
          return true
        }
        
        // Per tutte le altre route, richiedi un token valido
        return !!token
      },
    },
    pages: {
      signIn: "/login",
    },
  }
)

export const config = {
  matcher: [
    /*
     * SIMPLIFIED MATCHER for debugging
     * Match all routes except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ],
}
