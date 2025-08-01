import { NextRequest } from 'next/server'

// Simple in-memory rate limiter (for production use Redis)
const requests = new Map<string, { count: number; timestamp: number }>()

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export function rateLimit(config: RateLimitConfig) {
  return function checkRateLimit(request: NextRequest): { success: boolean; remaining: number } {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'localhost'
    
    const now = Date.now()
    const windowStart = now - config.windowMs
    
    // Get current request data
    const requestData = requests.get(ip)
    
    // Clean old requests
    if (requestData && requestData.timestamp < windowStart) {
      requests.delete(ip)
    }
    
    // Get updated request data
    const currentData = requests.get(ip)
    
    if (!currentData) {
      // First request from this IP
      requests.set(ip, { count: 1, timestamp: now })
      return { success: true, remaining: config.maxRequests - 1 }
    }
    
    if (currentData.count >= config.maxRequests) {
      // Rate limit exceeded
      return { success: false, remaining: 0 }
    }
    
    // Increment counter
    currentData.count++
    requests.set(ip, currentData)
    
    return { success: true, remaining: config.maxRequests - currentData.count }
  }
}

// Preset configurations
export const authRateLimit = rateLimit({
  maxRequests: 5, // 5 tentativi ogni 15 minuti
  windowMs: 15 * 60 * 1000 // 15 minuti
})

export const generalRateLimit = rateLimit({
  maxRequests: 100, // 100 richieste ogni minuto
  windowMs: 60 * 1000 // 1 minuto
})
