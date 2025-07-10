// Script per monitorare eventi di sicurezza
// Eseguire con: node scripts/security-monitor.js

const { supabase } = require('../src/lib/supabase')

async function monitorSecurity() {
  console.log('🔍 Monitoraggio eventi di sicurezza...\n')
  
  try {
    // Eventi di sicurezza recenti
    const { data: events, error: eventsError } = await supabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (eventsError) {
      console.error('❌ Errore recupero eventi:', eventsError.message)
      return
    }
    
    console.log(`📊 Ultimi ${events.length} eventi di sicurezza:`)
    console.log('=' .repeat(80))
    
    events.forEach((event, index) => {
      const date = new Date(event.created_at).toLocaleString()
      const severity = event.severity.toUpperCase()
      const severityIcon = {
        'LOW': '🟢',
        'MEDIUM': '🟡',
        'HIGH': '🔴',
        'CRITICAL': '🚨'
      }[severity] || '⚪'
      
      console.log(`${index + 1}. ${severityIcon} ${severity}`)
      console.log(`   Tipo: ${event.event_type}`)
      console.log(`   IP: ${event.ip_address}`)
      console.log(`   Endpoint: ${event.endpoint || 'N/A'}`)
      console.log(`   Data: ${date}`)
      if (event.details) {
        console.log(`   Dettagli: ${event.details}`)
      }
      console.log('')
    })
    
    // Statistiche
    const stats = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1
      acc[event.event_type] = (acc[event.event_type] || 0) + 1
      return acc
    }, {})
    
    console.log('📈 Statistiche:')
    console.log('=' .repeat(40))
    console.log('Per severità:')
    Object.entries(stats).forEach(([key, value]) => {
      if (['low', 'medium', 'high', 'critical'].includes(key)) {
        console.log(`  ${key.toUpperCase()}: ${value}`)
      }
    })
    
    console.log('\nPer tipo di evento:')
    Object.entries(stats).forEach(([key, value]) => {
      if (!['low', 'medium', 'high', 'critical'].includes(key)) {
        console.log(`  ${key}: ${value}`)
      }
    })
    
    // Rate limiting attivo
    console.log('\n🚦 Rate limiting attivo:')
    console.log('=' .repeat(40))
    
    const { data: rateLimits, error: rateLimitError } = await supabase
      .from('rate_limits')
      .select('*')
      .not('blocked_until', 'is', null)
      .gt('blocked_until', new Date().toISOString())
    
    if (rateLimitError) {
      console.error('❌ Errore recupero rate limits:', rateLimitError.message)
    } else if (rateLimits.length === 0) {
      console.log('✅ Nessun IP attualmente bloccato')
    } else {
      console.log(`🔒 ${rateLimits.length} IP attualmente bloccati:`)
      rateLimits.forEach((limit, index) => {
        const blockedUntil = new Date(limit.blocked_until).toLocaleString()
        console.log(`${index + 1}. IP: ${limit.identifier}`)
        console.log(`   Endpoint: ${limit.endpoint}`)
        console.log(`   Bloccato fino: ${blockedUntil}`)
        console.log(`   Richieste: ${limit.requests_count}`)
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('❌ Errore durante il monitoraggio:', error)
  }
}

// Esegui il monitoraggio
monitorSecurity()
