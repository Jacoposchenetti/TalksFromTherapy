import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const runtime = 'nodejs'

// GET /api/config - Verifica configurazione
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
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

    return NextResponse.json(config)

  } catch (error) {
    console.error("Errore verifica configurazione:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
