import { NextRequest, NextResponse } from 'next/server';
import { emoatlasService } from "@/lib/emoatlas";
import { verifyApiAuth, validateApiInput, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { CreditsService } from "@/lib/credits-service"

export async function POST(request: NextRequest) {
  try {
    // STEP 1: Verifica autorizzazione
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("🧠 POST /api/semantic-frame-analysis - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Verifica crediti prima di procedere
    const creditsService = new CreditsService()
    const requiredCredits = 1 // Semantic frame analysis costa 1 credito
    
    try {
      const userCredits = await creditsService.getUserCredits(authResult.user!.id)
      if (userCredits.credits_balance < requiredCredits) {
        return createErrorResponse(
          `Crediti insufficienti. Richiesti: ${requiredCredits}, Disponibili: ${userCredits.credits_balance}`, 
          402 // Payment Required
        )
      }
      console.log(`✅ Crediti sufficienti: ${userCredits.credits_balance} >= ${requiredCredits}`)
    } catch (creditsError) {
      console.error("❌ Errore verifica crediti:", creditsError)
      return createErrorResponse("Errore nella verifica crediti", 500)
    }

    // STEP 3: Validazione input
    const body = await request.json();
    
    if (!validateApiInput(body, ['text', 'targetWord'])) {
      return createErrorResponse("Dati richiesta non validi - text e targetWord richiesti", 400)
    }

    const { text, targetWord, sessionId, language = 'italian' } = body;

    // Validate input
    if (!text || !targetWord) {
      return NextResponse.json({
        success: false,
        error: 'Text and target word are required'
      }, { status: 400 });
    }

    if (text.length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Text is too short for semantic frame analysis (minimum 10 characters)'
      }, { status: 400 });
    }

    if (targetWord.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Target word must be at least 2 characters long'
      }, { status: 400 });
    }

    // Perform semantic frame analysis using the EmoAtlas service
    console.log('🔍 Starting semantic frame analysis for:', targetWord)
    
    const result = await emoatlasService.analyzeSemanticFrame(
      text,
      targetWord,
      sessionId,
      language
    )

    console.log('🎯 Semantic frame analysis result:', {
      success: result.success,
      target_word: result.target_word,
      connected_words: result.semantic_frame?.total_connections || 0
    })

    // STEP 4: Deduci crediti dopo successo completamento
    try {
      const newBalance = await creditsService.deductCredits(
        authResult.user!.id,
        'SEMANTIC_FRAME', // CreditFeature
        `Analisi semantic frame per "${targetWord}"`,
        sessionId || `frame-${targetWord}` // referenceId
      )
      console.log(`💳 Crediti dedotti: 1. Nuovo saldo: ${newBalance}`)
    } catch (creditsError) {
      console.error("⚠️ Errore deduzione crediti (analisi completata):", creditsError)
      // Non bloccare la risposta, l'analisi è già stata completata
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Semantic frame analysis API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Semantic Frame Analysis API',
    description: 'Analyze semantic frames using EmoAtlas',
    methods: ['POST'],
    requiredFields: ['text', 'targetWord'],
    optionalFields: ['sessionId', 'language']
  });
}
