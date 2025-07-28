"use client"

import { usePathname } from "next/navigation"
import { Navigation } from "./navigation"

export function ConditionalNavigation() {
  const pathname = usePathname()
  
  // Don't render navigation on auth pages
  const isLoginPage = pathname === '/login'
  const isRegisterPage = pathname === '/register' 
  const isHomePage = pathname === '/'
  const isTermsPage = pathname === '/terms'
  const isPrivacyPage = pathname === '/privacy'
  const isResetPasswordPage = pathname.startsWith('/reset-password')
  const isAuthPage = isLoginPage || isRegisterPage || isHomePage || isTermsPage || isPrivacyPage || isResetPasswordPage
  
  if (isAuthPage) {
    return null
  }
  
  return <Navigation />
}
