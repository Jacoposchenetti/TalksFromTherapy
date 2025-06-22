import { NextRequest, NextResponse } from "next/server"
import OpenAI from 'openai'

export async function GET() {
  try {
    // Test della configurazione OpenAI
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
      return NextResponse.json({
        error: "OPENAI_API_KEY non configurata o non valida",
        configured: false
      }, { status: 400 })
    }

    // Test di connessione base
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    try {
      // Test semplice: lista modelli disponibili
      const models = await openai.models.list()
      const whisperModel = models.data.find(model => model.id === 'whisper-1')
      
      return NextResponse.json({
        success: true,
        configured: true,
        whisperAvailable: !!whisperModel,
        apiKeyValid: true,
        message: "OpenAI configurato correttamente"
      })
      
    } catch (apiError: any) {
      console.error("Errore API OpenAI:", apiError)
      
      let errorMessage = "Errore sconosciuto"
      if (apiError.error?.type === 'invalid_api_key') {
        errorMessage = "Chiave API non valida"
      } else if (apiError.error?.type === 'insufficient_quota') {
        errorMessage = "Quota esaurita"
      } else if (apiError.message) {
        errorMessage = apiError.message
      }
      
      return NextResponse.json({
        error: errorMessage,
        configured: true,
        apiKeyValid: false,
        details: apiError.error
      }, { status: 400 })
    }

  } catch (error) {
    console.error("Errore test OpenAI:", error)
    return NextResponse.json({
      error: "Errore durante il test OpenAI",
      details: error instanceof Error ? error.message : "Errore sconosciuto"
    }, { status: 500 })
  }
}
