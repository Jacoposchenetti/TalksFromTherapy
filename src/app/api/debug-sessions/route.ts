import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    // Recupera tutte le sessioni dell'utente per debug
    const sessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      select: {
        id: true,
        title: true,
        status: true,
        audioFileName: true,
        audioUrl: true,
        errorMessage: true,
        createdAt: true,
        patient: {
          select: {
            id: true,
            initials: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json({
      totalSessions: sessions.length,
      sessions: sessions,
      userInfo: {
        id: session.user.id,
        email: session.user.email
      }
    })

  } catch (error) {
    console.error("Errore recupero sessioni:", error)
    return NextResponse.json({
      error: "Errore durante il recupero delle sessioni",
      details: error instanceof Error ? error.message : "Errore sconosciuto"
    }, { status: 500 })
  }
}
