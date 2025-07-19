const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://zmwmxhcpxobgbbtpvaqi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptd214aGNweG9iZ2JidHB2YXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMDUyNjksImV4cCI6MjA2Njg4MTI2OX0.1Gdq9Prb4BjJ40EAhUzJBLzb6hvykGTm73aoVxRg0FE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSupabaseData() {
  try {
    console.log('🔍 Checking Supabase database...')
    
    // Check patients with correct column names from screenshot
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('*')
    
    if (patientsError) {
      console.error('❌ Error fetching patients:', patientsError)
    } else {
      console.log(`📊 Patients found: ${patients?.length || 0}`)
      if (patients && patients.length > 0) {
        console.log('Patients data:')
        patients.forEach((p, i) => {
          console.log(`${i + 1}.`, JSON.stringify(p, null, 2))
        })
      }
    }
    
    // Check sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
    
    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError)
    } else {
      console.log(`📊 Sessions found: ${sessions?.length || 0}`)
      if (sessions && sessions.length > 0) {
        console.log('Sessions data:')
        sessions.forEach((s, i) => {
          console.log(`${i + 1}.`, JSON.stringify(s, null, 2))
        })
      }
    }
    
    // Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
    } else {
      console.log(`📊 Users found: ${users?.length || 0}`)
      if (users && users.length > 0) {
        console.log('Users data:')
        users.forEach((u, i) => {
          console.log(`${i + 1}.`, JSON.stringify(u, null, 2))
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkSupabaseData()
