import { useState, useEffect } from 'react'

export interface CookieConsent {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  functional: boolean
  timestamp: string
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('cookie-consent')
    const savedDate = localStorage.getItem('cookie-consent-date')
    
    if (saved && savedDate) {
      const consentData = JSON.parse(saved)
      const consentDate = new Date(savedDate)
      const now = new Date()
      const monthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate())
      
      // Se il consenso è più vecchio di 12 mesi, richiedi nuovo consenso
      if (consentDate > monthsAgo) {
        setConsent(consentData)
      }
    }
    setIsLoading(false)
  }, [])

  const updateConsent = (newConsent: Omit<CookieConsent, 'timestamp'>) => {
    const consentWithTimestamp = {
      ...newConsent,
      timestamp: new Date().toISOString()
    }
    
    localStorage.setItem('cookie-consent', JSON.stringify(consentWithTimestamp))
    localStorage.setItem('cookie-consent-date', new Date().toISOString())
    setConsent(consentWithTimestamp)
    
    // Load analytics if accepted
    if (newConsent.analytics && !window.gtag) {
      loadGoogleAnalytics()
    }
  }

  const loadGoogleAnalytics = () => {
    // Solo se hai Google Analytics configurato
    const GA_ID = process.env.NEXT_PUBLIC_GA_ID
    if (!GA_ID) return

    const script = document.createElement('script')
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
    script.async = true
    document.head.appendChild(script)
    
    window.dataLayer = window.dataLayer || []
    window.gtag = function() { window.dataLayer.push(arguments) }
    window.gtag('js', new Date())
    window.gtag('config', GA_ID, {
      anonymize_ip: true, // GDPR compliance
      cookie_flags: 'samesite=strict;secure'
    })
  }

  const resetConsent = () => {
    localStorage.removeItem('cookie-consent')
    localStorage.removeItem('cookie-consent-date')
    setConsent(null)
  }

  return {
    consent,
    updateConsent,
    resetConsent,
    isLoading,
    hasConsent: !!consent,
    canUseAnalytics: consent?.analytics ?? false,
    canUseMarketing: consent?.marketing ?? false,
    canUseFunctional: consent?.functional ?? false
  }
}

// Global type for gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}
