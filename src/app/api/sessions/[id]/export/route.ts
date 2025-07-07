import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { jsPDF } from "jspdf"
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sessionId = params.id
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')?.toLowerCase() || 'txt' // Default to TXT    // Validate format parameter
    if (!['txt', 'pdf', 'docx'].includes(format)) {
      return NextResponse.json({ error: "Invalid format. Use 'txt', 'pdf', or 'docx'" }, { status: 400 })
    }

    // Find the session and verify ownership
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        session_date,
        duration,
        transcript,
        patients(id, initials, name)
      `)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (!sessionData.transcript || sessionData.transcript.trim() === '') {
      return NextResponse.json({ error: "No transcript available for this session" }, { status: 400 })
    }

    // Generate filename with safe characters
    const date = new Date(sessionData.session_date).toISOString().split('T')[0]
    const safeTitle = sessionData.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
    const filename = `${sessionData.patients[0].initials}_${date}_${safeTitle}`

    if (format === 'pdf') {
      try {
        return await generatePDFExport(sessionData, filename)
      } catch (pdfError) {
        console.error("PDF generation error:", pdfError)
        
        // Return a proper error response instead of fallback
        return NextResponse.json({ 
          error: "Errore nella generazione del PDF", 
          details: `${(pdfError as Error).message}`,
          suggestion: "Prova con il formato TXT"
        }, { status: 500 })
      }
    } else if (format === 'docx') {
      try {
        return await generateDOCXExport(sessionData, filename)
      } catch (docxError) {
        console.error("DOCX generation error:", docxError)
        
        return NextResponse.json({ 
          error: "Errore nella generazione del DOCX", 
          details: `${(docxError as Error).message}`,
          suggestion: "Prova con il formato TXT"
        }, { status: 500 })
      }
    } else {
      return generateTXTExport(sessionData, filename)
    }} catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
    }, { status: 500 })
  }
}

async function generateTXTExport(sessionData: any, filename: string) {
  const date = new Date(sessionData.session_date).toLocaleDateString('it-IT')
  const duration = sessionData.duration 
    ? `${Math.floor(sessionData.duration / 60)}:${(sessionData.duration % 60).toString().padStart(2, '0')}` 
    : 'N/A'
  
  const content = `TRASCRIZIONE SESSIONE TERAPEUTICA
==================================

Paziente: ${sessionData.patients[0].initials}
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

async function generatePDFExport(sessionData: any, filename: string) {
  try {
    console.log("Generating PDF with jsPDF...")
    
    // Prepare data
    const date = new Date(sessionData.session_date).toLocaleDateString('it-IT')
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
      ['Paziente:', sessionData.patients[0].initials],
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

async function generateDOCXExport(sessionData: any, filename: string) {
  try {
    console.log("Generating DOCX with docx library...")
    
    // Prepare data
    const date = new Date(sessionData.session_date).toLocaleDateString('it-IT')
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
              new TextRun({ text: sessionData.patients[0].initials }),
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
