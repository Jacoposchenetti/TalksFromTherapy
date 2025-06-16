import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const sessionData = await prisma.session.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        transcript: true,
        patient: {
          select: {
            id: true,
            initials: true,
          },
        },
      },
    })

    if (!sessionData) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 })
    }

    return NextResponse.json(sessionData)
  } catch (error) {
    console.error("Error fetching session transcript:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}