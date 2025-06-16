import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

// Importazioni dinamiche per evitare problemi di bundling
async function parseDocument(file: File) {
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  
  // Validazione del tipo di file basata su estensione e MIME type
  const supportedExtensions = ['txt', 'doc', 'docx', 'pdf', 'rtf']
  const supportedMimeTypes = [
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'application/rtf',
    'text/rtf'
  ]
  
  if (!fileExtension || !supportedExtensions.includes(fileExtension)) {
    throw new Error(`Formato file non supportato: ${fileExtension}. Formati supportati: ${supportedExtensions.join(', ')}`)
  }
  
  if (!supportedMimeTypes.includes(file.type) && file.type !== '') {
    console.warn(`MIME type non riconosciuto: ${file.type}, ma estensione valida: ${fileExtension}`)
  }
  
  switch (fileExtension) {
    case 'txt':
      return parseTxt(file)
    case 'doc':
    case 'docx':
      return parseWord(file)
    case 'pdf':
      return parsePdf(file)
    case 'rtf':
      return parseRtf(file)
    default:
      throw new Error(`Formato file non supportato: ${fileExtension}`)
  }
}

async function parseTxt(file: File) {
  const text = await file.text()
  return {
    text,
    metadata: {
      wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
      format: 'txt'
    }
  }
}

async function parseWord(file: File) {
  try {
    // Import dinamico
    let mammoth
    try {
      mammoth = (await import('mammoth')).default
    } catch (importError) {
      console.error('Error importing mammoth:', importError)
      throw new Error('Libreria Word non disponibile')
    }
    
    console.log(`Parsing Word document: ${file.name}, size: ${file.size} bytes, type: ${file.type}`)
    
    // Verifica che il file sia effettivamente un documento Word
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !['doc', 'docx'].includes(extension)) {
      throw new Error(`Estensione file non valida: ${extension}. Sono supportati solo .doc e .docx`)
    }
    
    const arrayBuffer = await file.arrayBuffer()
    
    // Mammoth si aspetta un oggetto con la proprietà buffer
    const buffer = Buffer.from(arrayBuffer)
    
    console.log(`Buffer created, size: ${buffer.length} bytes`)
    
    // Usa mammoth con l'API corretta
    const result = await mammoth.extractRawText({ 
      buffer: buffer
    })
    
    console.log(`Mammoth result:`, {
      hasValue: !!result?.value,
      valueLength: result?.value?.length || 0,
      hasMessages: !!result?.messages,
      messagesCount: result?.messages?.length || 0
    })
    
    if (!result) {
      throw new Error('Mammoth non ha restituito alcun risultato')
    }
    
    if (!result.value) {
      throw new Error('Il documento Word non contiene testo estraibile')
    }
    
    if (result.value.trim().length === 0) {
      throw new Error('Il documento Word sembra essere vuoto')
    }
    
    // Log dei messaggi di Mammoth se presenti (warnings, etc.)
    if (result.messages && result.messages.length > 0) {
      console.log('Mammoth messages:', result.messages)
    }
    
    console.log(`Word document parsed successfully: ${result.value.length} characters`)
    
    return {
      text: result.value,
      metadata: {
        wordCount: result.value.split(/\s+/).filter(word => word.length > 0).length,
        format: extension
      }
    }
  } catch (error) {
    console.error('Error parsing Word document:', error)
    if (error instanceof Error) {
      if (error.message.includes('Could not find file')) {
        throw new Error('Il file Word non può essere letto. Potrebbe essere corrotto o protetto da password.')
      } else if (error.message.includes('ENOENT')) {
        throw new Error('File Word non trovato o corrotto')
      } else if (error.message.includes('Invalid')) {
        throw new Error('Il file non è un documento Word valido')
      } else if (error.message.includes('not a valid zip file')) {
        throw new Error('Il file Word sembra essere corrotto (non è un archivio ZIP valido)')
      } else {
        throw new Error(`Errore durante la lettura del documento Word: ${error.message}`)
      }
    }
    throw new Error('Errore sconosciuto durante la lettura del documento Word')
  }
}

async function parsePdf(file: File) {
  try {
    // Import dinamico con fallback per diversi moduli PDF
    let pdfParse
    try {
      pdfParse = (await import('pdf-parse')).default
    } catch (importError) {
      console.error('Error importing pdf-parse:', importError)
      throw new Error('Libreria PDF non disponibile')
    }
    
    const arrayBuffer = await file.arrayBuffer()
    
    // Assicuriamoci che il buffer sia nel formato corretto per pdf-parse
    const buffer = Buffer.from(arrayBuffer)
    
    console.log(`Parsing PDF: ${file.name}, size: ${file.size} bytes`)
    
    const data = await pdfParse(buffer)
    
    if (!data || !data.text) {
      throw new Error('Il PDF non contiene testo estraibile')
    }
    
    if (data.text.trim().length === 0) {
      throw new Error('Il PDF sembra essere vuoto o contiene solo immagini')
    }
    
    console.log(`PDF parsed successfully: ${data.text.length} characters, ${data.numpages} pages`)
    
    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        wordCount: data.text.split(/\s+/).filter(word => word.length > 0).length,
        format: 'pdf'
      }
    }
  } catch (error) {
    console.error('Error parsing PDF:', error)
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        throw new Error('File PDF non trovato o corrotto')
      } else if (error.message.includes('Invalid PDF')) {
        throw new Error('Il file non è un PDF valido')
      } else {
        throw new Error(`Errore durante la lettura del file PDF: ${error.message}`)
      }
    }
    throw new Error('Errore sconosciuto durante la lettura del PDF')
  }
}

async function parseRtf(file: File) {
  try {
    const text = await file.text()
    
    // Basic RTF cleaning - remove control words
    const cleanText = text
      .replace(/\\[a-z]+\d*\s?/g, '') // Remove RTF control words
      .replace(/[{}]/g, '') // Remove braces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
    
    return {
      text: cleanText,
      metadata: {
        wordCount: cleanText.split(/\s+/).filter(word => word.length > 0).length,
        format: 'rtf'
      }
    }
  } catch (error) {
    console.error('Error parsing RTF:', error)
    throw new Error('Errore durante la lettura del file RTF')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    console.log(`Parsing document: ${file.name}, type: ${file.type}, size: ${file.size} bytes`)

    // Parse the document
    const parsedDocument = await parseDocument(file)
    
    if (!parsedDocument.text || parsedDocument.text.trim().length === 0) {
      return NextResponse.json(
        { error: "Il documento sembra essere vuoto o non è stato possibile estrarre il testo" },
        { status: 400 }
      )
    }

    console.log(`Successfully parsed document: ${file.name}, extracted ${parsedDocument.text.length} characters`)

    return NextResponse.json(parsedDocument)
  } catch (error) {
    console.error("Error parsing document:", error)
    const errorMessage = error instanceof Error ? error.message : "Errore durante la lettura del documento"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
