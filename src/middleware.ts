import { auth } from "@/lib/auth"

export default auth((req) => {
  const { pathname } = req.nextUrl
  
  // Public routes che non richiedono autenticazione
  const publicRoutes = ["/", "/login", "/register", "/api/auth"]
  
  // Controlla se la route è pubblica
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  // Se l'utente non è autenticato e sta tentando di accedere a una route protetta
  if (!req.auth && !isPublicRoute) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return Response.redirect(loginUrl)
  }
  
  // Se l'utente è autenticato e sta tentando di accedere alle pagine di login/register
  if (req.auth && (pathname === "/login" || pathname === "/register")) {
    return Response.redirect(new URL("/dashboard", req.url))
  }
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}
