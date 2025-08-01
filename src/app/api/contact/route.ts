import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Accesso non autorizzato" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subject, message } = body

    // Validazioni
    if (!subject || !message) {
      return NextResponse.json(
        { error: "Oggetto e messaggio sono obbligatori" },
        { status: 400 }
      )
    }

    if (subject.trim().length < 5) {
      return NextResponse.json(
        { error: "L'oggetto deve essere di almeno 5 caratteri" },
        { status: 400 }
      )
    }

    if (message.trim().length < 10) {
      return NextResponse.json(
        { error: "Il messaggio deve essere di almeno 10 caratteri" },
        { status: 400 }
      )
    }

    // Configurazione email (con fallback per sviluppo)
    const emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true per 465, false per altri
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    }

    // Se non abbiamo configurazioni email, logga e restituisci successo per sviluppo
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 EMAIL DEVELOPMENT MODE - Messaggio ricevuto:')
      console.log(`Da: ${session.user.email}`)
      console.log(`Oggetto: ${subject}`)
      console.log(`Messaggio: ${message}`)
      
      return NextResponse.json({
        success: true,
        message: "Messaggio inviato con successo (modalità sviluppo)"
      })
    }

    // Crea transporter
    const transporter = nodemailer.createTransport(emailConfig)

    // Verifica configurazione
    await transporter.verify()

    // Prepara email
    const mailOptions = {
      from: `"${session.user.name || session.user.email}" <${process.env.EMAIL_FROM}>`,
      to: 'supporto@talksfromtherapy.com',
      replyTo: session.user.email, // Per poter rispondere direttamente
      subject: `[Supporto] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            Richiesta di Supporto
          </h2>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Da:</strong> ${session.user.name || 'Utente'} (${session.user.email})</p>
            <p><strong>Oggetto:</strong> ${subject}</p>
          </div>
          
          <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 5px;">
            <h3 style="color: #495057; margin-top: 0;">Messaggio:</h3>
            <p style="line-height: 1.6; color: #6c757d;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 5px; font-size: 12px; color: #6c757d;">
            <p>Questo messaggio è stato inviato tramite il modulo di contatto di TalksFromTherapy.</p>
            <p>Puoi rispondere direttamente a questa email per contattare l'utente.</p>
          </div>
        </div>
      `,
      text: `
        Richiesta di Supporto

        Da: ${session.user.name || 'Utente'} (${session.user.email})
        Oggetto: ${subject}

        Messaggio:
        ${message}

        ---
        Questo messaggio è stato inviato tramite il modulo di contatto di TalksFromTherapy.
      `
    }

    // Invia email
    await transporter.sendMail(mailOptions)

    console.log(`✅ Email di supporto inviata da ${session.user.email}`)

    return NextResponse.json({
      success: true,
      message: "Messaggio inviato con successo! Ti risponderemo il prima possibile."
    })

  } catch (error) {
    console.error('❌ Errore invio email supporto:', error)
    return NextResponse.json(
      { error: "Errore interno del server durante l'invio" },
      { status: 500 }
    )
  }
}
