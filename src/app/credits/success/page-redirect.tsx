"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PaymentSuccessRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect immediato alla pagina success corretta
    const urlParams = new URLSearchParams(window.location.search)
    const type = urlParams.get('type') || 'credits'
    const amount = urlParams.get('amount') || '300'
    
    router.replace(`/credits/success?type=${type}&amount=${amount}`)
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Reindirizzamento in corso...</p>
      </div>
    </div>
  )
}
