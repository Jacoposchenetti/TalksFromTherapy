const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://zmwmxhcpxobgbbtpvaqi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptd214aGNweG9iZ2JidHB2YXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMDUyNjksImV4cCI6MjA2Njg4MTI2OX0.1Gdq9Prb4BjJ40EAhUzJBLzb6hvykGTm73aoVxRg0FE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugUserData() {
  try {
    console.log('🔍 Debug: Checking all users in database...')
    
    // Check all users
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return
    }
    
    console.log(`📊 Total users in database: ${allUsers?.length || 0}`)
    if (allUsers && allUsers.length > 0) {
      allUsers.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.email} (ID: ${user.id}) - ${user.name}`)
      })
    }
    
    console.log('\n🔍 Debug: Checking all patients in database...')
    
    // Check all patients (to see which userIds they reference)
    const { data: allPatients, error: patientsError } = await supabase
      .from('patients')
      .select('id, initials, dateOfBirth, userid')
    
    if (patientsError) {
      console.error('❌ Error fetching patients:', patientsError)
    } else {
      console.log(`📊 Total patients in database: ${allPatients?.length || 0}`)
      if (allPatients && allPatients.length > 0) {
        allPatients.forEach((patient, i) => {
          console.log(`   ${i + 1}. Initials: ${patient.initials} (DOB: ${patient.dateOfBirth})`)
          console.log(`      UserId: ${patient.userid}`)
          console.log(`      Patient ID: ${patient.id}`)
        })
      }
    }
    
    console.log('\n🔍 Debug: Checking all sessions in database...')
    
    // Check all sessions
    const { data: allSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, sessionDate, userId, patientId, transcript, isActive')
    
    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError)
    } else {
      console.log(`📊 Total sessions in database: ${allSessions?.length || 0}`)
      if (allSessions && allSessions.length > 0) {
        allSessions.forEach((session, i) => {
          console.log(`   ${i + 1}. Date: ${session.sessionDate}`)
          console.log(`      UserId: ${session.userId}`)
          console.log(`      PatientId: ${session.patientId}`)
          console.log(`      Has transcript: ${!!session.transcript}`)
          console.log(`      Active: ${session.isActive}`)
        })
      }
    }
    
    // Now specifically check for the userId that has patients
    if (allPatients && allPatients.length > 0) {
      const userIdWithPatients = allPatients[0].userid
      console.log(`\n🔍 Debug: Checking data for userId with patients: ${userIdWithPatients}`)
      
      // Find user with this ID
      const userWithPatients = allUsers?.find(u => u.id === userIdWithPatients)
      if (userWithPatients) {
        console.log(`✅ User found: ${userWithPatients.email} - ${userWithPatients.name}`)
      } else {
        console.log(`❌ No user found with ID: ${userIdWithPatients}`)
      }
      
      // Count data for this user
      const userPatients = allPatients.filter(p => p.userid === userIdWithPatients)
      const userSessions = allSessions?.filter(s => s.userId === userIdWithPatients) || []
      const userTranscripts = userSessions.filter(s => s.transcript)
      
      console.log(`📊 Data for this user:`)
      console.log(`   - Patients: ${userPatients.length}`)
      console.log(`   - Sessions: ${userSessions.length}`)
      console.log(`   - Transcriptions: ${userTranscripts.length}`)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

debugUserData()
