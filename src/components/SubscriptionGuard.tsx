'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { createClient } from '@supabase/supabase-js'

interface SubscriptionGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function SubscriptionGuard({ children, fallback }: SubscriptionGuardProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [userInfo, setUserInfo] = useState<{ name: string; daysRemaining: number } | null>(null)
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return // Still loading
    
    if (status === 'unauthenticated') {
      console.log('❌ No NextAuth session found')
      setHasAccess(false)
      return
    }
    
    if (status === 'authenticated' && session?.user?.email) {
      checkSubscriptionStatus(session.user.email)
    }
  }, [session, status])

  // Redirect when access is denied
  useEffect(() => {
    if (hasAccess === false) {
      console.log('🔄 Redirecting to renewal page due to inactive subscription')
      const timer = setTimeout(() => {
        router.push('/renew')
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [hasAccess, router])

  const checkSubscriptionStatus = async (userEmail: string) => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      console.log(`🔍 Checking subscription for user: ${userEmail}`)

      // Get user details from database using email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, credits, subscription_status, subscription_expires_at')
        .eq('email', userEmail)
        .single()

      if (userError) {
        console.error('Error fetching user data:', userError)
        setHasAccess(false)
        return
      }

      const { name, credits: userCredits, subscription_status, subscription_expires_at } = userData

      // Check if subscription is active
      let isSubscriptionActive = false
      let daysRemaining = 0

      if (subscription_status === 'active' && subscription_expires_at) {
        const expiryDate = new Date(subscription_expires_at)
        const now = new Date()
        const timeDiff = expiryDate.getTime() - now.getTime()
        daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)))
        
        isSubscriptionActive = daysRemaining > 0
        
        // Se è scaduto, aggiorna lo stato nel database
        if (daysRemaining <= 0) {
          await supabase
            .from('users')
            .update({ subscription_status: 'expired' })
            .eq('email', userEmail)
        }
      }

      // REGOLA RIGOROSA: Solo abbonamenti "active" con giorni rimanenti possono accedere
      // Qualsiasi altro stato (expired, inactive, pending, cancelled, ecc.) = NO ACCESS
      const hasAccess = subscription_status === 'active' && isSubscriptionActive

      console.log(`🔐 Access check for ${name}: subscription=${subscription_status}, active=${isSubscriptionActive}, credits=${userCredits}, hasAccess=${hasAccess}`)
      
      if (!hasAccess) {
        console.log(`❌ Access denied for ${name} - subscription status '${subscription_status}' is not active. Will redirect to /renew`)
      } else {
        console.log(`✅ Access granted for ${name} - subscription is active with ${daysRemaining} days remaining`)
      }

      setHasAccess(hasAccess)
      setUserInfo({ name, daysRemaining: isSubscriptionActive ? daysRemaining : 0 })

    } catch (error) {
      console.error('Error checking subscription:', error)
      setHasAccess(false)
    }
  }

  // Loading state (either NextAuth loading or subscription check loading)
  if (status === 'loading' || hasAccess === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {status === 'loading' ? 'Caricamento sessione...' : 'Verifica abbonamento...'}
          </p>
        </div>
      </div>
    )
  }

  // Has access - show protected content
  if (hasAccess) {
    return <>{children}</>
  }

  // No access - automatically redirect to renewal page (handled by useEffect)
  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Reindirizzamento alla pagina di rinnovo...</p>
        </div>
      </div>
    )
  }

  // Fallback nel caso ci sia un errore
  if (fallback) {
    return <>{fallback}</>
  }

  // If no access, should never reach here due to redirect above
  return null
}