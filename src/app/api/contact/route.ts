import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    // Verifica che l'utente sia autenticato
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Non autenticato" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, subject, category, priority, message } = body

    // Validazioni
    if (!name || !subject || !category || !message) {
      return NextResponse.json(
        { error: "Tutti i campi obbligatori devono essere compilati" },
        { status: 400 }
      )
    }

    console.log("📧 Contact form submission:", {
      from: session.user.email,
      name,
      subject,
      category,
      priority
    })

    // Configurazione email transporter
    const transporter = nodemailer.createTransporter({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    // Componi il messaggio email
    const emailContent = `
Nuova richiesta di supporto da TalksFromTherapy

DETTAGLI UTENTE:
- Nome: ${name}
- Email: ${session.user.email}
- Categoria: ${category}
- Priorità: ${priority}

OGGETTO: ${subject}

MESSAGGIO:
${message}

---
Inviato il: ${new Date().toLocaleString('it-IT')}
Piattaforma: TalksFromTherapy Support System
    `.trim()

    // Invia l'email
    await transporter.sendMail({
      from: `"${name}" <${session.user.email}>`,
      to: "supporto@talksfromtherapy.com",
      subject: `[${category.toUpperCase()}] ${subject}`,
      text: emailContent,
      replyTo: session.user.email,
    })

    console.log("✅ Support email sent successfully")

    return NextResponse.json({
      success: true,
      message: "Messaggio inviato con successo"
    })

  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json(
      { error: "Errore durante l'invio dell'email" },
      { status: 500 }
    )
  }
}
