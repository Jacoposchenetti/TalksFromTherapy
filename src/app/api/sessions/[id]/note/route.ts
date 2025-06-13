import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = 'nodejs'

// GET /api/sessions/[id]/note - Get note for a session
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sessionId = params.id

    // Verify session belongs to user
    const sessionRecord = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        isActive: true,
      },
    })

    if (!sessionRecord) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Find existing note
    const note = await prisma.sessionNote.findFirst({
      where: {
        sessionId: sessionId,
      },
    })

    return NextResponse.json({
      id: note?.id,
      content: note?.content || "",
      sessionId: sessionId,
      createdAt: note?.createdAt,
      updatedAt: note?.updatedAt,
    })
  } catch (error) {
    console.error("Error fetching session note:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/sessions/[id]/note - Create or update note for a session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sessionId = params.id
    const { content } = await request.json()

    if (typeof content !== 'string') {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Verify session belongs to user
    const sessionRecord = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        isActive: true,
      },
    })

    if (!sessionRecord) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Upsert note
    const note = await prisma.sessionNote.upsert({
      where: {
        sessionId: sessionId,
      },
      update: {
        content: content,
        updatedAt: new Date(),
      },
      create: {
        sessionId: sessionId,
        content: content,
      },
    })

    return NextResponse.json({
      id: note.id,
      content: note.content,
      sessionId: note.sessionId,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })
  } catch (error) {
    console.error("Error saving session note:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
