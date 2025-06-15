"use client"

import { usePathname } from "next/navigation"
import { Navigation } from "./navigation"

export function ConditionalNavigation() {
  const pathname = usePathname()
  
  // Don't render navigation on auth pages
  const isLoginPage = pathname === '/login'
  const isRegisterPage = pathname === '/register' 
  const isHomePage = pathname === '/'
  const isAuthPage = isLoginPage || isRegisterPage || isHomePage
  
  console.log("ConditionalNavigation Debug:", {
    pathname,
    isAuthPage,
    willRenderNavigation: !isAuthPage
  })
  
  if (isAuthPage) {
    return null
  }
  
  return <Navigation />
}
