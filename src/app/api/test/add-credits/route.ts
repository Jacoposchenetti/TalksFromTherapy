import { NextRequest, NextResponse } from 'next/server'
import { CreditsService } from '@/lib/credits-service'
import { getServerSession } from 'next-auth'

// Endpoint temporaneo per testare l'aggiunta di crediti
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { credits, description } = await req.json()
    
    if (!credits || !description) {
      return NextResponse.json({ error: 'Missing credits or description' }, { status: 400 })
    }

    console.log(`🧪 Manual test: Adding ${credits} credits to user ${session.user.id}`)
    
    const creditsService = new CreditsService()
    await creditsService.addCreditsFromWebhook(
      session.user.id,
      credits,
      description,
      'manual_test_' + Date.now()
    )

    return NextResponse.json({ 
      success: true, 
      message: `Added ${credits} credits successfully`,
      userId: session.user.id
    })

  } catch (error) {
    console.error('❌ Manual credit test failed:', error)
    return NextResponse.json(
      { error: 'Failed to add credits', details: error.message },
      { status: 500 }
    )
  }
}
