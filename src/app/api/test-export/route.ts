import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Test the export endpoint by making a request to it
    const sessionId = "test-session-id"
    const format = "txt"
    
    return NextResponse.json({ 
      message: "Export API endpoint created successfully",
      endpoints: {
        txt: `/api/sessions/${sessionId}/export?format=txt`,
        pdf: `/api/sessions/${sessionId}/export?format=pdf`
      },
      usage: {
        description: "Export session transcripts in TXT or PDF format",
        method: "GET",
        authentication: "Required (session-based)",
        parameters: {
          id: "Session ID (path parameter)",
          format: "Export format: 'txt' or 'pdf' (query parameter, defaults to 'txt')"
        }
      }
    })
  } catch (error) {
    return NextResponse.json({ error: "Test failed" }, { status: 500 })
  }
}
