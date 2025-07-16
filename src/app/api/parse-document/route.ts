import { NextRequest, NextResponse } from "next/server"
import { verifyApiAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"

// File size limit: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Importazioni dinamiche per evitare problemi di bundling
async function parseDocument(file: File) {
  // SECURITY: Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File troppo grande. Massimo consentito: ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
  
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  
  // SECURITY: Strict validation del tipo di file basata su estensione e MIME type
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
  
  // SECURITY: More strict MIME type validation
  if (file.type && !supportedMimeTypes.includes(file.type)) {
    throw new Error(`MIME type non valido: ${file.type}`)
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
  console.log(`📝 Parsing TXT file: ${file.name}, size: ${file.size}, type: ${file.type}`)
  const text = await file.text()
  console.log(`📝 TXT parsing result: ${text.length} characters, first 100 chars: "${text.substring(0, 100)}"`)
  
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
    // STEP 1: Verifica autorizzazione
    const authResult = await verifyApiAuth(request)
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("POST /api/parse-document - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Validazione form data
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return createErrorResponse("Nessun file fornito", 400)
    }

    // SECURITY: Validate file name (prevent path traversal)
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')
    if (sanitizedFileName !== file.name) {
      return createErrorResponse("Nome file non valido", 400)
    }

    console.log(`Parsing document: ${sanitizedFileName}, type: ${file.type}, size: ${file.size} bytes`)      // STEP 3: Parse the document (già con validazioni di sicurezza)
      console.log(`🔍 About to parse document: ${sanitizedFileName}, type: ${file.type}, size: ${file.size}`)
      const parsedDocument = await parseDocument(file)
      console.log(`📄 Parse result:`, {
        hasText: !!parsedDocument.text,
        textLength: parsedDocument.text?.length || 0,
        trimmedLength: parsedDocument.text?.trim().length || 0,
        metadata: parsedDocument.metadata
      })
      
      if (!parsedDocument.text || parsedDocument.text.trim().length === 0) {
        console.error(`❌ Empty document detected - text: "${parsedDocument.text}", trimmed length: ${parsedDocument.text?.trim().length || 0}`)
        return createErrorResponse("Il documento sembra essere vuoto o non è stato possibile estrarre il testo", 400)
      }
      console.log(`✅ Successfully parsed document: ${sanitizedFileName}, extracted ${parsedDocument.text.length} characters`)

    return createSuccessResponse(parsedDocument, "Documento analizzato con successo")
  } catch (error) {
    console.error("Error parsing document:", error)
    const errorMessage = error instanceof Error ? error.message : "Errore durante la lettura del documento"
    return createErrorResponse(errorMessage, 500)
  }
}
