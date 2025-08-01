export interface ParsedDocument {
  text: string
  metadata?: {
    pages?: number
    wordCount?: number
    format: string
  }
}

export class DocumentParser {
  static async parseFile(file: File): Promise<ParsedDocument> {
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch("/api/parse-document", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Errore durante il parsing del documento")
    }

    const result = await response.json()
    // Handle the API response structure { success: true, data: parsedDocument }
    return result.data || result
  }

  static getSupportedFormats(): string[] {
    return ['txt', 'doc', 'docx', 'pdf', 'rtf']
  }

  static getSupportedMimeTypes(): string[] {
    return [
      'text/plain', // .txt
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/pdf', // .pdf
      'application/rtf', // .rtf
      'text/rtf' // .rtf alternative mime type
    ]
  }

  static getAcceptString(): string {
    return '.txt,.doc,.docx,.pdf,.rtf'
  }
}
