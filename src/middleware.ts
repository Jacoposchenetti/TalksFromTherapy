import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Additional middleware logic can go here
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
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next (all Next.js internal files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - static assets (.css, .js, .png, etc.)
     */
    "/((?!api|_next|favicon.ico|public|.*\\..*).*)",
  ],
}
