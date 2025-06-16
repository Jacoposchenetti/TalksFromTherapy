import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    // Test delle importazioni delle librerie
    const testResults = {
      mammoth: false,
      pdfParse: false,
      buffer: typeof Buffer !== 'undefined'
    }

    try {
      await import('mammoth')
      testResults.mammoth = true
    } catch (error) {
      console.error('Mammoth import failed:', error)
    }

    try {
      await import('pdf-parse')
      testResults.pdfParse = true
    } catch (error) {
      console.error('PDF-parse import failed:', error)
    }

    return NextResponse.json({
      status: 'ok',
      libraries: testResults,
      nodeVersion: process.version,
      platform: process.platform
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Test di base senza parsing complesso
    const basicInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }

    return NextResponse.json({
      status: 'ok',
      message: 'File received successfully',
      file: basicInfo
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
