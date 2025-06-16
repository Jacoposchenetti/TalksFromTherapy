import { NextRequest, NextResponse } from "next/server"
import PDFDocument from "pdfkit"

export async function GET(request: NextRequest) {
  try {
    console.log("Starting PDF test generation...")
    
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    })

    const chunks: Buffer[] = []
    
    doc.on('data', chunk => {
      chunks.push(chunk)
    })

    return new Promise<NextResponse>((resolve, reject) => {
      doc.on('end', () => {
        try {
          console.log("PDF generation completed, creating buffer...")
          const pdfBuffer = Buffer.concat(chunks)
          console.log(`PDF buffer size: ${pdfBuffer.length} bytes`)
          
          resolve(new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': 'attachment; filename="test.pdf"',
              'Content-Length': pdfBuffer.length.toString(),
            },
          }))
        } catch (error) {
          console.error("Error creating PDF buffer:", error)
          reject(error)
        }
      })

      doc.on('error', (error) => {
        console.error("PDFKit generation error:", error)
        reject(error)
      })

      try {
        console.log("Adding content to PDF...")
        
        // Very simple content
        doc.fontSize(20)
           .text('TEST PDF GENERATION', { align: 'center' })
           .moveDown(1)

        doc.fontSize(12)
           .text('Questo è un test per verificare che la generazione PDF funzioni correttamente.')
           .moveDown(1)
           .text(`Generato il: ${new Date().toLocaleString('it-IT')}`)

        console.log("Content added, finalizing PDF...")
        doc.end()
      } catch (contentError) {
        console.error("Error adding content to PDF:", contentError)
        reject(contentError)
      }
    })
  } catch (error) {
    console.error("PDF test initialization error:", error)
    return NextResponse.json({ 
      error: "Errore nel test PDF", 
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
    }, { status: 500 })
  }
}
