import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"

export const runtime = 'nodejs'

// GET /api/config - Verifica configurazione
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    // SECURITY WARNING: This is a config endpoint - should be restricted in production
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_CONFIG_API !== 'true') {
      return createErrorResponse("Config API non disponibile in produzione", 403)
    }

    const config = {
      openai: {
        configured: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== '***REMOVED***your-openai-api-key-here'),
        apiKey: process.env.OPENAI_API_KEY ? 
          `${process.env.OPENAI_API_KEY.slice(0, 7)}...${process.env.OPENAI_API_KEY.slice(-4)}` : 
          'Non configurata'
      },
      database: {
        configured: !!process.env.DATABASE_URL
      },
      auth: {
        configured: !!(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL)
      }
    }

    return createSuccessResponse(config)

  } catch (error) {
    console.error("Errore verifica configurazione:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}
