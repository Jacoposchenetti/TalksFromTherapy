import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get("patientId")

    const whereClause = {
      userId: user.id,
      isActive: true,
      ...(patientId && { patientId }),
    }

    const sessions = await prisma.session.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        sessionDate: "desc",
      },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error("Error fetching sessions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const patientId = formData.get("patientId") as string
    const title = formData.get("title") as string

    if (!audioFile || !patientId || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify patient belongs to user
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        userId: user.id,
        isActive: true,
      },
    })

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "uploads", "audio")
    await mkdir(uploadsDir, { recursive: true })

    // Save the audio file
    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const fileName = `${Date.now()}-${audioFile.name}`
    const filePath = join(uploadsDir, fileName)
    await writeFile(filePath, buffer)

    // Create session record
    const newSession = await prisma.session.create({
      data: {
        userId: user.id,
        patientId,
        title,
        audioFileName: fileName,
        audioUrl: `/uploads/audio/${fileName}`,
        audioFileSize: audioFile.size,
        sessionDate: new Date(),
        status: "UPLOADED",
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // TODO: Trigger transcription job here
    // This would typically be done with a background job queue

    return NextResponse.json(newSession, { status: 201 })
  } catch (error) {
    console.error("Error creating session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
