import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, transcript } = body;

    if (!session_id || !transcript) {
      return NextResponse.json(
        { error: 'Missing session_id or transcript' },
        { status: 400 }
      );
    }

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
