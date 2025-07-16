import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  console.log("🧪 GET /api/test-emotion called!")
  return NextResponse.json({
    status: "test-emotion working",
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  console.log("🧪 POST /api/test-emotion called!")
  return NextResponse.json({
    status: "test-emotion POST working",
    timestamp: new Date().toISOString()
  })
}
