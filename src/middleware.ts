import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
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
        
        // Controlla se la route è pubblica
        const isPublicRoute = publicRoutes.some(route => 
          pathname === route || pathname.startsWith(route + "/")
        )
        
        // Se la route è pubblica, permettila sempre
        if (isPublicRoute) {
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
     * IMPORTANTE: Il matcher blocca tutto quando GLOBAL_BLOCK_MODE=true
     * Include sia pagine che API routes per protezione totale
     */
    '/',
    '/(api|auth|dashboard|patients|sessions|transcriptions)/:path*',
    '/((?!_next|favicon.ico).*)'
  ],
}
