import { prisma } from './src/lib/prisma'

async function testConnection() {
  try {
    // Test query per verificare che il database sia accessibile
    const userCount = await prisma.user.count()
    console.log('✅ Database connection successful!')
    console.log(`Users in database: ${userCount}`)
    
    // Test di creazione di un utente dummy per verificare lo schema
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
        licenseNumber: 'TEST123'
      }
    })
    console.log('✅ User creation successful:', testUser.id)
    
    // Pulisco il test user
    await prisma.user.delete({
      where: { id: testUser.id }
    })
    console.log('✅ Test cleanup successful')
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
