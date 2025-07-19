// Simple connection test
const { createClient } = require('@supabase/supabase-js')

// Use the same environment variables as the app
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Environment check:')
console.log('   URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('   Service Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing')

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('\n❌ Missing environment variables!')
  console.log('   Make sure .env.local contains:')
  console.log('   - NEXT_PUBLIC_SUPABASE_URL')
  console.log('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function testBasicConnection() {
  console.log('\n🔗 Testing basic Supabase connection...')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Test basic table access
    const { data, error } = await supabase
      .from('patients')
      .select('count(*)', { count: 'exact', head: true })
    
    if (error) {
      console.log('❌ Error:', error.message)
      console.log('   Details:', error)
    } else {
      console.log('✅ Connection successful!')
      console.log('   Patient count:', data)
    }
  } catch (err) {
    console.log('❌ Connection failed:', err.message)
  }
}

testBasicConnection()
