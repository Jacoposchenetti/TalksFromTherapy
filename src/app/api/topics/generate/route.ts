import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth, validateApiInput, createErrorResponse, createSuccessResponse } from "@/lib/auth-utils"
import { CreditsService } from "@/lib/credits-service"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // STEP 1: Verifica autorizzazione
    const authResult = await verifyApiAuth()
    if (!authResult.success) {
      return createErrorResponse(authResult.error || "Non autorizzato", 401)
    }

    console.log("🏷️ POST /api/topics/generate - Richiesta autorizzata", { 
      userId: authResult.user?.id 
    })

    // STEP 2: Verifica crediti prima di procedere
    const creditsService = new CreditsService()
    const requiredCredits = 1 // Custom topic generation costa 1 credito
    
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
    
    if (!validateApiInput(body, ['session_id', 'transcript'])) {
      return createErrorResponse("Dati richiesta non validi - session_id e transcript richiesti", 400)
    }

    const { session_id, transcript } = body;

    // Get Python service URL from environment
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL;
    
    if (!pythonServiceUrl) {
      return NextResponse.json(
        { error: 'Python service not configured' },
        { status: 500 }
      );
    }

    // Call Python service for topic analysis
    const response = await fetch(`${pythonServiceUrl}/single-document-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id,
        transcript
      }),
    });

    if (!response.ok) {
      throw new Error(`Python service error: ${response.status}`);
    }

    const data = await response.json();

    // STEP 4: Deduci crediti dopo successo completamento
    try {
      const newBalance = await creditsService.deductCredits(
        authResult.user!.id,
        'CUSTOM_TOPIC_MODELLING', // CreditFeature
        `Generazione topic personalizzati per sessione ${session_id}`,
        session_id // referenceId
      )
      console.log(`💳 Crediti dedotti: 1. Nuovo saldo: ${newBalance}`)
    } catch (creditsError) {
      console.error("⚠️ Errore deduzione crediti (analisi completata):", creditsError)
      // Non bloccare la risposta, l'analisi è già stata completata
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Topic generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
