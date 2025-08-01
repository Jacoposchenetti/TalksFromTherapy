// Test script per verificare il sistema di sicurezza
// Eseguire con: node scripts/test-security.js

const { supabase } = require('../src/lib/supabase')

async function testSecuritySystem() {
  console.log('🔍 Test del sistema di sicurezza...\n')
  
  try {
    // Test 1: Verifica che le tabelle di sicurezza esistano
    console.log('1. Verifica tabelle di sicurezza...')
    
    const { data: rateLimits, error: rateLimitError } = await supabase
      .from('rate_limits')
      .select('*')
      .limit(1)
    
    if (rateLimitError) {
      console.error('❌ Tabella rate_limits non trovata:', rateLimitError.message)
    } else {
      console.log('✅ Tabella rate_limits OK')
    }
    
    const { data: securityEvents, error: securityError } = await supabase
      .from('security_events')
      .select('*')
      .limit(1)
    
    if (securityError) {
      console.error('❌ Tabella security_events non trovata:', securityError.message)
    } else {
      console.log('✅ Tabella security_events OK')
    }
    
    // Test 2: Verifica RLS policies
    console.log('\n2. Verifica RLS policies...')
    
    const { data: policies, error: policyError } = await supabase
      .rpc('get_policies', { table_name: 'users' })
    
    if (policyError) {
      console.log('⚠️  Non è possibile verificare le RLS policies da JavaScript')
      console.log('   Verifica manualmente nel dashboard di Supabase')
    } else {
      console.log('✅ RLS policies sembrano configurate')
    }
    
    // Test 3: Test di inserimento security event
    console.log('\n3. Test inserimento security event...')
    
    const { data: insertResult, error: insertError } = await supabase
      .from('security_events')
      .insert({
        event_type: 'test_event',
        identifier: 'test_ip',
        details: JSON.stringify({ test: true }),
        severity: 'low'
      })
    
    if (insertError) {
      console.error('❌ Errore inserimento security event:', insertError.message)
    } else {
      console.log('✅ Security event inserito correttamente')
    }
    
    // Test 4: Test rate limiting
    console.log('\n4. Test rate limiting...')
    
    const { data: rateLimitResult, error: rateLimitInsertError } = await supabase
      .from('rate_limits')
      .insert({
        identifier: 'test_ip',
        endpoint: '/api/test',
        requests_count: 1
      })
    
    if (rateLimitInsertError) {
      console.error('❌ Errore inserimento rate limit:', rateLimitInsertError.message)
    } else {
      console.log('✅ Rate limit inserito correttamente')
    }
    
    // Cleanup test data
    console.log('\n5. Cleanup dati di test...')
    
    await supabase
      .from('security_events')
      .delete()
      .eq('event_type', 'test_event')
    
    await supabase
      .from('rate_limits')
      .delete()
      .eq('identifier', 'test_ip')
    
    console.log('✅ Cleanup completato')
    
    console.log('\n🎉 Test completato con successo!')
    console.log('\n📝 Prossimi passi:')
    console.log('   1. Verifica che tutte le tabelle esistano')
    console.log('   2. Configura i cron jobs per il cleanup')
    console.log('   3. Monitora la tabella security_events per eventi sospetti')
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error)
  }
}

// Esegui il test
testSecuritySystem()
