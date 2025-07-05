import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, transcript } = body

    if (!session_id || !transcript) {
      return NextResponse.json(
        { error: 'session_id and transcript are required' },
        { status: 400 }
      )
    }

    console.log('Single session analysis request:', { session_id, transcript_length: transcript.length })

    // Call Python service for single document analysis
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001'
    
    console.log('Calling Python service at:', `${pythonServiceUrl}/single-document-analysis`)
      const response = await fetch(`${pythonServiceUrl}/single-document-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },      body: JSON.stringify({
        session_id,
        transcript
      }),
    })

    if (!response.ok) {
      console.error('Python service error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      
      return NextResponse.json(
        { error: 'Failed to analyze session', details: errorText },
        { status: 500 }
      )
    }

    const analysisResult = await response.json()
    console.log('Analysis result received:', analysisResult)

    return NextResponse.json(analysisResult)
  } catch (error) {
    console.error('Error in single-session-analysis:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
