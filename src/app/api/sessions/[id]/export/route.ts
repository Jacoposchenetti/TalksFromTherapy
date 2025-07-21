import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, validateApiInput, createErrorResponse, createSuccessResponse, sanitizeInput, hasResourceAccess } from "@/lib/auth-utils"
import { createClient } from "@supabase/supabase-js"
import { jsPDF } from "jspdf"
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx"
import { decryptIfEncrypted } from "@/lib/encryption"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verifica autorizzazione con sistema unificato
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    // Validazione parametri
    if (!params.id || typeof params.id !== 'string') {
      return createErrorResponse("ID sessione non valido", 400)
    }

    const sessionId = sanitizeInput(params.id)
    const { searchParams } = new URL(request.url)
    const format = sanitizeInput(searchParams.get('format')?.toLowerCase() || 'txt') // Default to TXT
    
    // Validazione formato
    if (!['txt', 'pdf', 'docx'].includes(format)) {
      return createErrorResponse("Formato non valido. Usa 'txt', 'pdf', o 'docx'", 400)
    }

    // Usa la service key per bypassare RLS come fanno le altre API
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('[EXPORT DEBUG] sessionId:', sessionId)
    console.log('[EXPORT DEBUG] userId:', authResult.user?.id)
    console.log('[EXPORT DEBUG] Query params:', {
      id: sessionId,
      userId: authResult.user?.id,
      isActive: true
    })

    // Find the session and verify ownership SICURO
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        title,
        sessionDate,
        duration,
        transcript,
        status,
        userId,
        patients (
          id,
          initials,
          userId
        )
      `)
      .eq('id', sessionId)
      .eq('userId', authResult.user!.id)
      .eq('isActive', true)
      .single()

    console.log('[EXPORT DEBUG] Query result:', { data: sessionData, error: sessionError })

    if (sessionError || !sessionData) {
      return createErrorResponse("Sessione non trovata", 404)
    }

    // Double check accesso alla risorsa
    if (!hasResourceAccess(authResult.user!.id, sessionData.userId)) {
      return createErrorResponse("Accesso negato a questa risorsa", 403)
    }

    // Decripta il transcript se è criptato
    const decryptedTranscript = decryptIfEncrypted(sessionData.transcript)
    
    if (!decryptedTranscript || decryptedTranscript.trim() === '') {
      return createErrorResponse("Nessun transcript disponibile per questa sessione", 400)
    }

    // Usa il transcript decriptato
    sessionData.transcript = decryptedTranscript

    // Verifica accesso al paziente se esiste
    if (sessionData.patients && sessionData.patients.length > 0) {
      const patient = sessionData.patients[0]
      if (patient.userId && !hasResourceAccess(authResult.user!.id, patient.userId)) {
        return createErrorResponse("Accesso negato al paziente", 403)
      }
    }

    // Generate filename with safe characters
    const date = new Date(sessionData.sessionDate).toISOString().split('T')[0]
    const safeTitle = sanitizeInput(sessionData.title || 'sessione').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
    const pazienteInitials = sessionData.patients && Array.isArray(sessionData.patients) && sessionData.patients.length > 0
      ? sessionData.patients[0].initials
      : 'N/A';
    const filename = `${pazienteInitials}_${date}_${safeTitle}`

    if (format === 'pdf') {
      try {
        return await generatePDFExport(sessionData, filename, pazienteInitials)
      } catch (pdfError) {
        console.error("PDF generation error:", pdfError)
        return createErrorResponse("Errore nella generazione del PDF", 500)
      }
    } else if (format === 'docx') {
      try {
        return await generateDOCXExport(sessionData, filename, pazienteInitials)
      } catch (docxError) {
        console.error("DOCX generation error:", docxError)
        return createErrorResponse("Errore nella generazione del DOCX", 500)
      }
    } else {
      return generateTXTExport(sessionData, filename, pazienteInitials)
    }
  } catch (error) {
    console.error("Export error:", error)
    return createErrorResponse("Errore interno del server", 500)
  }
}

async function generateTXTExport(sessionData: any, filename: string, pazienteInitials: string) {
  const date = new Date(sessionData.sessionDate).toLocaleDateString('it-IT')
  const duration = sessionData.duration 
    ? `${Math.floor(sessionData.duration / 60)}:${(sessionData.duration % 60).toString().padStart(2, '0')}` 
    : 'N/A'
  
  const content = `TRASCRIZIONE SESSIONE TERAPEUTICA
==================================

Paziente: ${pazienteInitials}
Titolo Sessione: ${sessionData.title}
Data: ${date}
Durata: ${duration}
Stato: ${sessionData.status}

TRASCRIZIONE:
${'-'.repeat(50)}

${sessionData.transcript}

${'-'.repeat(50)}
Esportato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}
`

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.txt"`,
    },
  })
}

async function generatePDFExport(sessionData: any, filename: string, pazienteInitials: string) {
  try {
    console.log("Generating PDF with jsPDF...")
    
    // Prepare data
    const date = new Date(sessionData.sessionDate).toLocaleDateString('it-IT')
    const duration = sessionData.duration 
      ? `${Math.floor(sessionData.duration / 60)}:${(sessionData.duration % 60).toString().padStart(2, '0')}` 
      : 'N/A'

    // Create new jsPDF instance
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Set font and margins
    const margin = 20
    const pageWidth = doc.internal.pageSize.width
    const maxWidth = pageWidth - (margin * 2)
    
    // Helper function to add text with word wrapping
    const addText = (text: string, x: number, y: number, fontSize: number = 12, isBold: boolean = false): number => {
      doc.setFontSize(fontSize)
      if (isBold) {
        doc.setFont("helvetica", "bold")
      } else {
        doc.setFont("helvetica", "normal")
      }
      
      const lines = doc.splitTextToSize(text, maxWidth)
      doc.text(lines, x, y)
      return y + (lines.length * (fontSize * 0.5)) // Approximate line height
    }

    // Title
    let currentY = margin + 10
    currentY = addText('TRASCRIZIONE SESSIONE TERAPEUTICA', margin, currentY, 18, true)
    
    // Add a line under the title
    currentY += 5
    doc.setLineWidth(0.5)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 15

    // Session information
    currentY = addText('INFORMAZIONI SESSIONE', margin, currentY, 14, true)
    currentY += 10

    // Info table
    const infoData = [
      ['Paziente:', pazienteInitials],
      ['Titolo Sessione:', sessionData.title],
      ['Data:', date],
      ['Durata:', duration],
      ['Stato:', sessionData.status]
    ]

    for (const [label, value] of infoData) {
      currentY = addText(label, margin, currentY, 12, true)
      currentY = addText(value, margin + 40, currentY - 6, 12, false) // Offset to align with label
      currentY += 2
    }

    currentY += 10

    // Transcript section
    currentY = addText('TRASCRIZIONE', margin, currentY, 14, true)
    currentY += 10

    // Add transcript text with automatic page breaks
    const transcriptLines = doc.splitTextToSize(sessionData.transcript, maxWidth)
    const lineHeight = 6
    const pageHeight = doc.internal.pageSize.height
    const bottomMargin = 30

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)

    for (let i = 0; i < transcriptLines.length; i++) {
      // Check if we need a new page
      if (currentY + lineHeight > pageHeight - bottomMargin) {
        doc.addPage()
        currentY = margin + 10
      }
      
      doc.text(transcriptLines[i], margin, currentY)
      currentY += lineHeight
    }

    // Footer
    const footerY = pageHeight - 20
    doc.setFontSize(10)
    doc.setFont("helvetica", "italic")
    const footerText = `Esportato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}`
    doc.text(footerText, margin, footerY)

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    
    console.log(`PDF generated successfully: ${pdfBuffer.length} bytes`)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("jsPDF generation error:", error)
    throw error
  }
}

async function generateDOCXExport(sessionData: any, filename: string, pazienteInitials: string) {
  try {
    console.log("Generating DOCX with docx library...")
    
    // Prepare data
    const date = new Date(sessionData.sessionDate).toLocaleDateString('it-IT')
    const duration = sessionData.duration 
      ? `${Math.floor(sessionData.duration / 60)}:${(sessionData.duration % 60).toString().padStart(2, '0')}` 
      : 'N/A'

    // Create new Document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: "TRASCRIZIONE SESSIONE TERAPEUTICA",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          
          // Empty line
          new Paragraph({ text: "" }),
          
          // Session information
          new Paragraph({
            text: "INFORMAZIONI SESSIONE",
            heading: HeadingLevel.HEADING_2,
          }),
          
          new Paragraph({ text: "" }),
          
          // Session details
          new Paragraph({
            children: [
              new TextRun({ text: "Paziente: ", bold: true }),
              new TextRun({ text: pazienteInitials }),
            ],
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "Titolo Sessione: ", bold: true }),
              new TextRun({ text: sessionData.title }),
            ],
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "Data: ", bold: true }),
              new TextRun({ text: date }),
            ],
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "Durata: ", bold: true }),
              new TextRun({ text: duration }),
            ],
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "Stato: ", bold: true }),
              new TextRun({ text: sessionData.status }),
            ],
          }),
          
          // Empty lines
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
          
          // Transcript section
          new Paragraph({
            text: "TRASCRIZIONE",
            heading: HeadingLevel.HEADING_2,
          }),
          
          new Paragraph({ text: "" }),
          
          // Transcript content
          new Paragraph({
            text: sessionData.transcript,
            alignment: AlignmentType.JUSTIFIED,
          }),
          
          // Empty lines
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
          
          // Footer
          new Paragraph({
            children: [
              new TextRun({ 
                text: `Esportato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}`,
                italics: true,
                size: 20 // 10pt in half-points
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
        ],
      }],
    })

    // Generate DOCX buffer
    const docxBuffer = await Packer.toBuffer(doc)
    
    console.log(`DOCX generated successfully: ${docxBuffer.length} bytes`)

    return new NextResponse(docxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}.docx"`,
        'Content-Length': docxBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("DOCX generation error:", error)
    throw error
  }
}
