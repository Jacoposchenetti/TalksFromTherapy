import { CreditsService } from '@/lib/credits-service'

// Script per testare l'aggiunta manuale di crediti dopo pagamento
export async function testAddCredits() {
  console.log('🧪 Testing manual credit addition...')
  
  const creditsService = new CreditsService()
  
  // Sostituisci con il tuo user ID reale
  const testUserId = 'USER_ID_QUI'
  const testCredits = 300
  const testDescription = 'Test manual credit addition - Pacchetto Base'
  
  try {
    await creditsService.addCreditsFromWebhook(
      testUserId,
      testCredits,
      testDescription,
      'test_payment_12345'
    )
    
    console.log(`✅ Successfully added ${testCredits} credits to user ${testUserId}`)
  } catch (error) {
    console.error('❌ Failed to add credits:', error)
  }
}

// Per eseguire: testAddCredits()
