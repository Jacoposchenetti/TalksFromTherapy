import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Debug del reset password - log delle richieste
  if (pathname.includes('reset-password') || pathname.includes('/api/auth')) {
    console.log('Reset password request:', {
      pathname,
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    })
  }
  
  // Permetti sempre le route di autenticazione e reset password
  if (pathname.startsWith('/api/auth') || 
      pathname.startsWith('/reset-password') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/register') ||
      pathname.includes('_next') ||
      pathname.includes('favicon')) {
    return NextResponse.next()
  }
  
  // Per ora, permetti tutto il resto per debug
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication endpoints)
     * - reset-password (password reset pages)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
