const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const supabaseUrl = 'https://zmwmxhcpxobgbbtpvaqi.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptd214aGNweG9iZ2JidHB2YXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMwNTI2OSwiZXhwIjoyMDY2ODgxMjY5fQ.WPLfZVWDjlwu7Mhq1_0gzIiaqtN1gNKQcmF_K6kN1-Y'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestData() {
  const email = 'jschenetti@gmail.com'
  const password = 'password123'
  
  try {
    console.log('🔄 Creating test user and data...')
    
    // Create user
    const hashedPassword = await bcrypt.hash(password, 12)
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        name: 'Jacopo Schenetti',
        password: hashedPassword,
        acceptedTermsAt: new Date().toISOString(),
        acceptedPrivacyAt: new Date().toISOString(),
        consentVersion: '1.0'
      })
      .select()
      .single()
    
    if (userError) {
      console.error('❌ Error creating user:', userError)
      return
    }
    
    console.log('✅ User created:', user.email)
    
    // Create test patients
    const patients = [
      {
        userId: user.id,
        name: 'Mario Rossi',
        email: 'mario.rossi@email.com',
        phone: '+39 123 456 7890',
        dateOfBirth: '1985-03-15',
        notes: 'Paziente con ansia generalizzata',
        isActive: true
      },
      {
        userId: user.id,
        name: 'Giulia Verdi',
        email: 'giulia.verdi@email.com',
        phone: '+39 098 765 4321',
        dateOfBirth: '1990-07-22',
        notes: 'Terapia cognitivo-comportamentale per depressione',
        isActive: true
      },
      {
        userId: user.id,
        name: 'Luca Bianchi',
        email: 'luca.bianchi@email.com',
        phone: '+39 555 123 456',
        dateOfBirth: '1988-11-08',
        notes: 'Disturbi del sonno e stress lavorativo',
        isActive: true
      }
    ]
    
    const { data: createdPatients, error: patientsError } = await supabase
      .from('patients')
      .insert(patients)
      .select()
    
    if (patientsError) {
      console.error('❌ Error creating patients:', patientsError)
      return
    }
    
    console.log(`✅ Created ${createdPatients.length} patients`)
    
    // Create test sessions
    const sessions = []
    createdPatients.forEach((patient, index) => {
      // Create 2-3 sessions per patient
      for (let i = 0; i < (index + 2); i++) {
        const sessionDate = new Date()
        sessionDate.setDate(sessionDate.getDate() - (i * 7)) // Weekly sessions
        
        sessions.push({
          userId: user.id,
          patientId: patient.id,
          sessionDate: sessionDate.toISOString(),
          duration: 50 + (i * 5), // 50-60 minutes
          notes: `Sessione ${i + 1} con ${patient.name}. Progressi nella terapia.`,
          transcript: i === 0 ? `Trascrizione della sessione con ${patient.name}. Il paziente ha riferito miglioramenti...` : null,
          isActive: true
        })
      }
    })
    
    const { data: createdSessions, error: sessionsError } = await supabase
      .from('sessions')
      .insert(sessions)
      .select()
    
    if (sessionsError) {
      console.error('❌ Error creating sessions:', sessionsError)
      return
    }
    
    console.log(`✅ Created ${createdSessions.length} sessions`)
    
    // Summary
    console.log('\n📊 Test data created successfully:')
    console.log(`   👤 User: ${user.email}`)
    console.log(`   👥 Patients: ${createdPatients.length}`)
    console.log(`   📋 Sessions: ${createdSessions.length}`)
    console.log(`   📝 Transcriptions: ${sessions.filter(s => s.transcript).length}`)
    console.log('\n🔑 Login credentials:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

createTestData()
