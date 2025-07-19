// Test script to debug the NextAuth + Supabase integration
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://zmwmxhcpxobgbbtpvaqi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptd214aGNweG9iZ2JidHB2YXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMDUyNjksImV4cCI6MjA2Njg4MTI2OX0.1Gdq9Prb4BjJ40EAhUzJBLzb6hvykGTm73aoVxRg0FE'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptd214aGNweG9iZ2JidHB2YXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMwNTI2OSwiZXhwIjoyMDY2ODgxMjY5fQ.WPLfZVWDjlwu7Mhq1_0gzIiaqtN1gNKQcmF_K6kN1-Y'

async function testSupabaseConnection() {
  console.log('🔍 Testing different Supabase client configurations...\n')
  
  // Test 1: Anon client
  console.log('1️⃣ Testing with ANON client...')
  const anonClient = createClient(supabaseUrl, supabaseAnonKey)
  
  try {
    const { data: anonPatients, error: anonError } = await anonClient
      .from('patients')
      .select('*')
      .limit(5)
    
    console.log('   ✅ Anon client result:')
    console.log('   - Patients count:', anonPatients?.length || 0)
    console.log('   - Error:', anonError?.message || 'None')
    if (anonPatients && anonPatients.length > 0) {
      console.log('   - Sample patient:', anonPatients[0])
    }
  } catch (error) {
    console.log('   ❌ Anon client error:', error.message)
  }
  
  console.log('\n2️⃣ Testing with SERVICE ROLE client...')
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    const { data: servicePatients, error: serviceError } = await serviceClient
      .from('patients')
      .select('*')
      .limit(5)
    
    console.log('   ✅ Service client result:')
    console.log('   - Patients count:', servicePatients?.length || 0)
    console.log('   - Error:', serviceError?.message || 'None')
    if (servicePatients && servicePatients.length > 0) {
      console.log('   - Sample patient:', servicePatients[0])
      console.log('   - Available columns:', Object.keys(servicePatients[0]))
    }
  } catch (error) {
    console.log('   ❌ Service client error:', error.message)
  }
  
  // Test 3: Check auth users
  console.log('\n3️⃣ Checking Supabase Auth users...')
  try {
    const { data: authUsers, error: authError } = await serviceClient.auth.admin.listUsers()
    
    console.log('   ✅ Auth users result:')
    console.log('   - Auth users count:', authUsers?.users?.length || 0)
    console.log('   - Error:', authError?.message || 'None')
    
    if (authUsers?.users && authUsers.users.length > 0) {
      console.log('   - Sample auth user:')
      const user = authUsers.users[0]
      console.log('     ID:', user.id)
      console.log('     Email:', user.email)
      console.log('     Created:', user.created_at)
      console.log('     Email confirmed:', user.email_confirmed_at)
    }
  } catch (error) {
    console.log('   ❌ Auth users error:', error.message)
  }
  
  // Test 4: Check public.users table
  console.log('\n4️⃣ Checking public.users table...')
  try {
    const { data: publicUsers, error: publicError } = await serviceClient
      .from('users')
      .select('*')
      .limit(5)
    
    console.log('   ✅ Public users result:')
    console.log('   - Public users count:', publicUsers?.length || 0)
    console.log('   - Error:', publicError?.message || 'None')
    
    if (publicUsers && publicUsers.length > 0) {
      console.log('   - Sample public user:')
      const user = publicUsers[0]
      console.log('     ID:', user.id)
      console.log('     Email:', user.email)
      console.log('     Name:', user.name)
    }
  } catch (error) {
    console.log('   ❌ Public users error:', error.message)
  }
  
  // Test 5: Manual authentication
  console.log('\n5️⃣ Testing manual authentication...')
  try {
    const { data: authData, error: authError } = await serviceClient.auth.signInWithPassword({
      email: 'jschenetti@gmail.com',
      password: 'password123'
    })
    
    if (authError) {
      console.log('   ❌ Auth error:', authError.message)
    } else {
      console.log('   ✅ Authentication successful!')
      console.log('     User ID:', authData.user?.id)
      console.log('     Email:', authData.user?.email)
      console.log('     Email confirmed:', authData.user?.email_confirmed_at)
      
      // Now test fetching patients with this authenticated user
      const { data: userPatients, error: userError } = await serviceClient
        .from('patients')
        .select('*')
        .eq('userid', authData.user?.id)
      
      console.log('   📊 Patients for this user:')
      console.log('     Count:', userPatients?.length || 0)
      if (userError) {
        console.log('     Error:', userError.message)
      }
    }
  } catch (error) {
    console.log('   ❌ Manual auth error:', error.message)
  }
}

testSupabaseConnection()
