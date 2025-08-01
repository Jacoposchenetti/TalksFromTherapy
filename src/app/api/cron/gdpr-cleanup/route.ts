export const dynamic = 'force-dynamic'
// src/app/api/cron/gdpr-cleanup/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (for Vercel Cron or similar)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Starting GDPR cleanup job...')

    // Execute the automatic GDPR cleanup function
    const { data, error } = await supabaseAdmin
      .rpc('perform_automatic_gdpr_cleanup')

    if (error) {
      console.error('❌ GDPR cleanup error:', error)
      return NextResponse.json({ 
        error: 'Cleanup failed', 
        details: error.message 
      }, { status: 500 })
    }

    const deletedCount = data || 0

    console.log(`✅ GDPR cleanup completed. Deleted ${deletedCount} sessions.`)

    // Also cleanup storage files for deleted sessions
    await cleanupOrphanedStorageFiles()

    return NextResponse.json({
      success: true,
      deletedSessions: deletedCount,
      timestamp: new Date().toISOString(),
      compliance: 'GDPR Art. 17 automated compliance'
    })

  } catch (error) {
    console.error('❌ GDPR cleanup job failed:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

async function cleanupOrphanedStorageFiles() {
  try {
    // Get all files from storage
    const { data: files, error } = await supabaseAdmin.storage
      .from('talksfromtherapy')
      .list()

    if (error) throw error

    // Get active sessions to compare
    const { data: activeSessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('audioFileName')
      .eq('isActive', true)

    if (sessionsError) throw sessionsError

    const activeFileNames = new Set(
      activeSessions
        .map(s => s.audioFileName)
        .filter(Boolean)
    )

    // Find orphaned files
    const orphanedFiles = files?.filter(file => 
      !activeFileNames.has(file.name)
    ) || []

    // Delete orphaned files
    if (orphanedFiles.length > 0) {
      const filePaths = orphanedFiles.map(f => f.name)
      await supabaseAdmin.storage
        .from('talksfromtherapy')
        .remove(filePaths)
      
      console.log(`🗑️ Cleaned up ${orphanedFiles.length} orphaned files`)
    }

  } catch (error) {
    console.error('⚠️ Storage cleanup error:', error)
  }
}

// GET method for manual testing
export async function GET() {
  return NextResponse.json({ 
    message: 'GDPR Cleanup endpoint. Use POST with proper authorization.' 
  })
}
