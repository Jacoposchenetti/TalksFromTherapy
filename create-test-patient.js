import { prisma } from './src/lib/prisma.js'

async function createTestPatient() {
  try {
    const patient = await prisma.patient.create({
      data: {
        initials: 'M.R.',
        dateOfBirth: new Date('1985-01-01'),
        notes: 'Paziente di test per upload documenti'
      }
    })
    
    console.log('Test patient created:', patient)
  } catch (error) {
    console.error('Error creating test patient:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestPatient()
