import { PrismaClient } from '@prisma/client'

// Set DATABASE_URL environment variable
process.env.DATABASE_URL = "file:./dev.db"

const prisma = new PrismaClient()

async function createTestPatientWithSessions() {
  try {
    // Sample therapy session transcripts in Italian
    const transcripts = [
      `Oggi mi sento molto ansioso per il lavoro. Ho una presentazione importante domani e non riesco a smettere di pensarci. Mi sveglio di notte con il cuore che batte forte. Mia madre mi ha sempre detto di essere perfetto in tutto quello che faccio. Questo mi crea molta pressione. A casa con il mio partner le cose vanno meglio, mi sento più rilassato. Però quando penso al capo che mi giudicherà, l'ansia torna subito.`,
      
      `Questa settimana è stata difficile. I conflitti con i colleghi mi stanno logoraando. Non riesco a dormire bene e ho sempre mal di testa. La relazione con mia sorella è tesa da anni. Parliamo poco e quando lo facciamo finiamo sempre per litigare. Vorrei trovare un modo per migliorare la comunicazione. Ho provato a essere più paziente ma è difficile.`,
      
      `Ho notato dei miglioramenti dall'ultima volta. Le tecniche di respirazione che mi ha insegnato stanno funzionando. Quando sento arrivare l'ansia, provo a concentrarmi sul respiro e mi calmo. A lavoro le cose vanno meglio. Ho parlato con il mio capo dei miei timori e si è mostrato comprensivo. Sto imparando a non essere così duro con me stesso.`,
      
      `Oggi voglio parlare della mia infanzia. I miei genitori erano molto esigenti. Dovevo sempre avere voti alti a scuola. Non era mai abbastanza. Questo ha creato in me una forte paura del fallimento. Anche ora, da adulto, ho sempre paura di deludere le persone. Sto cercando di capire come questi schemi influenzano la mia vita attuale.`,
      
      `Il fine settimana è andato bene. Ho passato tempo con gli amici e mi sono sentito normale. Non ho pensato ai problemi di lavoro. Abbiamo fatto una passeggiata in montagna e mi sono sentito in pace. La natura mi aiuta sempre a rilassarmi. Vorrei riuscire a mantenere questa serenità anche durante la settimana lavorativa.`
    ];    // Create test patient
    const patient = await prisma.patient.create({
      data: {
        initials: 'M.R.',
        dateOfBirth: new Date('1985-03-15'),
        notes: 'Paziente di test per analisi sliding window e topic modeling',
        userId: 'cmc12i4vw000011bnzkuxtu14' // Real user ID from registration
      }
    });
    
    console.log('Test patient created:', patient);

    // Create test sessions with transcripts
    const sessions = [];
    for (let i = 0; i < transcripts.length; i++) {
      const session = await prisma.session.create({
        data: {
          patientId: patient.id,
          userId: 'cmc12i4vw000011bnzkuxtu14', // Same user ID
          title: `Sessione ${i + 1}`,
          sessionDate: new Date(Date.now() - (transcripts.length - i) * 7 * 24 * 60 * 60 * 1000), // One week apart
          transcript: transcripts[i],
          duration: 3000, // 50 minutes in seconds
          status: 'TRANSCRIBED'
        }
      });
      sessions.push(session);
      console.log(`Session ${i + 1} created:`, session.id);
    }

    console.log(`\n✅ Created test patient with ${sessions.length} sessions!`);
    console.log(`Patient ID: ${patient.id}`);
    console.log(`Session IDs: ${sessions.map(s => s.id).join(', ')}`);
    
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPatientWithSessions();
