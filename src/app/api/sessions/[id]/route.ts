import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unlink } from "fs/promises"
import { join } from "path"

export async function DELETE(
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

    // Find the session and verify ownership
    const sessionToDelete = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        isActive: true,
      },
    })

    if (!sessionToDelete) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Delete the audio file if it exists
    if (sessionToDelete.audioFileName) {
      try {
        const audioPath = join(process.cwd(), "uploads", "audio", sessionToDelete.audioFileName)
        await unlink(audioPath)
      } catch (fileError) {
        console.warn("Could not delete audio file:", fileError)
        // Continue with database deletion even if file deletion fails
      }
    }    // Soft delete the session (set isActive to false)
    await prisma.session.update({
      where: { id: sessionId },
      data: { 
        isActive: false
      },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error deleting session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

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

    const sessionData = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        isActive: true,
      },
      include: {
        patient: {
          select: {
            id: true,
            initials: true,
          },
        },
      },
    })

    if (!sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json(sessionData)
  } catch (error) {
    console.error("Error fetching session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    }    const sessionId = params.id
    const body = await request.json()
    const { title, transcript } = body

    // Validate input - either title or transcript (or both) should be provided
    if (!title && !transcript) {
      return NextResponse.json({ 
        error: "Either title or transcript must be provided" 
      }, { status: 400 })
    }

    // Validate title if provided
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ 
          error: "Title must be a non-empty string" 
        }, { status: 400 })
      }

      if (title.trim().length > 255) {
        return NextResponse.json({ 
          error: "Title must be less than 255 characters" 
        }, { status: 400 })
      }
    }

    // Validate transcript if provided
    if (transcript !== undefined) {
      if (typeof transcript !== 'string') {
        return NextResponse.json({ 
          error: "Transcript must be a string" 
        }, { status: 400 })
      }

      if (transcript.trim().length === 0) {
        return NextResponse.json({ 
          error: "Transcript cannot be empty" 
        }, { status: 400 })
      }
    }

    // Verify session exists and user owns it
    const existingSession = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        isActive: true,
      },
    })

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }    // Update the session with provided fields
    const updateData: any = { updatedAt: new Date() }
    
    if (title !== undefined) {
      updateData.title = title.trim()
    }
    
    if (transcript !== undefined) {
      updateData.transcript = transcript.trim()
    }

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            initials: true,
          },
        },
      },
    })

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error("Error updating session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}