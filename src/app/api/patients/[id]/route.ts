import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = 'nodejs'

// GET /api/patients/[id] - Ottieni dettagli singolo paziente
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: params.id,
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
        sessions: {
          select: {
            id: true,
            title: true,
            sessionDate: true,
            duration: true,
            status: true,
            createdAt: true
          },
          where: {
            isActive: true
          },
          orderBy: {
            sessionDate: 'desc'
          }
        },
        _count: {
          select: {
            sessions: true,
            analyses: true
          }
        }
      }
    })

    if (!patient) {
      return NextResponse.json(
        { error: "Paziente non trovato" },
        { status: 404 }
      )
    }

    return NextResponse.json({ patient })

  } catch (error) {
    console.error("Errore durante il recupero paziente:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}

// PUT /api/patients/[id] - Aggiorna paziente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }

    const { initials, dateOfBirth, notes } = await request.json()

    // Verifica che il paziente esista e appartenga all'utente
    const existingPatient = await prisma.patient.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        isActive: true
      }
    })

    if (!existingPatient) {
      return NextResponse.json(
        { error: "Paziente non trovato" },
        { status: 404 }
      )
    }

    // Validazione
    if (initials && (initials.trim().length < 2 || !/^[A-Za-z\s]+$/.test(initials.trim()))) {
      return NextResponse.json(
        { error: "Le iniziali devono essere di almeno 2 caratteri e contenere solo lettere" },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (initials !== undefined) updateData.initials = initials.trim().toUpperCase()
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
    if (notes !== undefined) updateData.notes = notes?.trim() || null

    const patient = await prisma.patient.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        initials: true,
        dateOfBirth: true,
        notes: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      message: "Paziente aggiornato con successo",
      patient
    })

  } catch (error) {
    console.error("Errore durante l'aggiornamento paziente:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}

// DELETE /api/patients/[id] - Soft delete paziente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }

    // Verifica che il paziente esista e appartenga all'utente
    const existingPatient = await prisma.patient.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        isActive: true
      }
    })

    if (!existingPatient) {
      return NextResponse.json(
        { error: "Paziente non trovato" },
        { status: 404 }
      )
    }

    // Soft delete - marca come inattivo invece di eliminare
    await prisma.patient.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    return NextResponse.json({
      message: "Paziente eliminato con successo"
    })

  } catch (error) {
    console.error("Errore durante l'eliminazione paziente:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
