const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://zmwmxhcpxobgbbtpvaqi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptd214aGNweG9iZ2JidHB2YXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMDUyNjksImV4cCI6MjA2Njg4MTI2OX0.1Gdq9Prb4BjJ40EAhUzJBLzb6hvykGTm73aoVxRg0FE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseData() {
  const email = 'jschenetti@gmail.com'
  
  try {
    console.log('🔍 Checking database data for:', email)
    
    // First, let's see what users exist in the database
    console.log('📋 Checking all users in database...')
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, email, name')
      .limit(10)
    
    if (allUsersError) {
      console.error('❌ Error fetching all users:', allUsersError)
      return
    }
    
    console.log(`📊 Total users found: ${allUsers?.length || 0}`)
    if (allUsers && allUsers.length > 0) {
      allUsers.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.email} (ID: ${u.id}) - Name: ${u.name}`)
      })
    }
    
    // Get specific user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email.toLowerCase())
      .single()
    
    if (userError) {
      console.error('❌ Error fetching specific user:', userError)
      console.log('💡 Trying to find user with partial email match...')
      
      // Try to find user with partial match
      const { data: partialUsers, error: partialError } = await supabase
        .from('users')
        .select('id, email, name')
        .ilike('email', '%jschenetti%')
      
      if (!partialError && partialUsers && partialUsers.length > 0) {
        console.log('✅ Found users with similar email:')
        partialUsers.forEach((u, i) => {
          console.log(`   ${i + 1}. ${u.email} (ID: ${u.id})`)
        })
        return
      }
      return
    }
    
    if (!user) {
      console.log('❌ User not found')
      return
    }
    
    console.log('✅ User found:', user)
    
    // Check patients
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, name, email, isActive')
      .eq('userId', user.id)
    
    if (patientsError) {
      console.error('❌ Error fetching patients:', patientsError)
    } else {
      console.log(`📊 Patients found: ${patients?.length || 0}`)
      if (patients && patients.length > 0) {
        patients.forEach((p, i) => {
          console.log(`   ${i + 1}. ${p.name} (${p.email}) - Active: ${p.isActive}`)
        })
      }
    }
    
    // Check sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, sessionDate, duration, transcript, isActive')
      .eq('userId', user.id)
    
    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError)
    } else {
      console.log(`📊 Sessions found: ${sessions?.length || 0}`)
      if (sessions && sessions.length > 0) {
        sessions.forEach((s, i) => {
          console.log(`   ${i + 1}. ${s.sessionDate} - Duration: ${s.duration}min - Has transcript: ${!!s.transcript} - Active: ${s.isActive}`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkDatabaseData()
