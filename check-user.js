const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const supabaseUrl = 'https://zmwmxhcpxobgbbtpvaqi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptd214aGNweG9iZ2JidHB2YXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMDUyNjksImV4cCI6MjA2Njg4MTI2OX0.1Gdq9Prb4BjJ40EAhUzJBLzb6hvykGTm73aoVxRg0FE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndCreateUser() {
  const email = 'jschenetti@gmail.com'
  const password = 'password123' // Password di default
  
  try {
    console.log('🔍 Checking for user:', email)
    
    // Verifica se l'utente esiste
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, name, password')
      .eq('email', email.toLowerCase())
      .single()
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching user:', fetchError)
      return
    }
    
    if (existingUser) {
      console.log('✅ User found in database:')
      console.log('   ID:', existingUser.id)
      console.log('   Email:', existingUser.email) 
      console.log('   Name:', existingUser.name)
      console.log('   Has password:', !!existingUser.password)
      
      // Testa la password attuale
      if (existingUser.password) {
        const isValidOldPassword = await bcrypt.compare(password, existingUser.password)
        console.log('   Password "password123" valid:', isValidOldPassword)
        
        // Testa altre password comuni
        const commonPasswords = ['123456', 'admin', 'test123', 'password']
        for (const testPassword of commonPasswords) {
          const isValid = await bcrypt.compare(testPassword, existingUser.password)
          if (isValid) {
            console.log(`   ✅ Password "${testPassword}" is valid!`)
            return
          }
        }
      }
      
      // Aggiorna la password
      console.log('🔄 Updating password to "password123"...')
      const hashedPassword = await bcrypt.hash(password, 12)
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', existingUser.id)
      
      if (updateError) {
        console.error('❌ Error updating password:', updateError)
      } else {
        console.log('✅ Password updated successfully!')
      }
      
    } else {
      console.log('❌ User not found. Creating new user...')
      
      // Crea nuovo utente
      const hashedPassword = await bcrypt.hash(password, 12)
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          name: 'Test User',
          password: hashedPassword
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating user:', createError)
      } else {
        console.log('✅ User created successfully!')
        console.log('   Email:', email)
        console.log('   Password: password123')
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkAndCreateUser()
