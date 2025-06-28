import { NextRequest, NextResponse } from 'next/server';
import { emoatlasService } from "@/lib/emoatlas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
