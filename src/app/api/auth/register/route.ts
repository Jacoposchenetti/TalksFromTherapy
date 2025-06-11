import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/password"

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, licenseNumber } = await request.json()

    // Validazione base
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e password sono obbligatori" },
        { status: 400 }
      )
    }

    // Validazione email formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato email non valido" },
        { status: 400 }
      )
    }

    // Validazione password lunghezza
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La password deve essere di almeno 8 caratteri" },
        { status: 400 }
      )
    }

    // Controlla se l'email esiste già
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utente con questa email esiste già" },
        { status: 409 }
      )
    }

    // Hash della password
    const hashedPassword = await hashPassword(password)

    // Crea l'utente
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        licenseNumber: licenseNumber || null
      },
      select: {
        id: true,
        name: true,
        email: true,
        licenseNumber: true,
        createdAt: true
      }
    })

    return NextResponse.json(
      { 
        message: "Utente creato con successo",
        user 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Errore durante la registrazione:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
