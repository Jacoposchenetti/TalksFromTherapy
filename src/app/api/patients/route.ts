import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = 'nodejs'

// GET /api/patients - Lista pazienti dell'utente autenticato
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }

    const patients = await prisma.patient.findMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      select: {
        id: true,
        initials: true,
        dateOfBirth: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sessions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ patients })

  } catch (error) {
    console.error("Errore durante il recupero pazienti:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}

// POST /api/patients - Crea nuovo paziente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }

    const { initials, dateOfBirth, notes } = await request.json()

    // Validazione
    if (!initials || initials.trim().length < 2) {
      return NextResponse.json(
        { error: "Le iniziali devono essere di almeno 2 caratteri" },
        { status: 400 }
      )
    }

    // Verifica che le iniziali siano solo lettere
    if (!/^[A-Za-z\s]+$/.test(initials.trim())) {
      return NextResponse.json(
        { error: "Le iniziali possono contenere solo lettere" },
        { status: 400 }
      )
    }

    const patient = await prisma.patient.create({
      data: {
        userId: session.user.id,
        initials: initials.trim().toUpperCase(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        notes: notes?.trim() || null
      },
      select: {
        id: true,
        initials: true,
        dateOfBirth: true,
        notes: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(
      { 
        message: "Paziente creato con successo",
        patient 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Errore durante la creazione paziente:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
