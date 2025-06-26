// Script per creare sessioni di test con transcript per topic modeling
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestSessions() {
  try {
    console.log("Creazione sessioni di test...");

    // Trova il primo utente
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log("Nessun utente trovato. Creando utente di test...");
      const newUser = await prisma.user.create({
        data: {
          email: "test@therapy.com",
          password: "password",
          name: "Dr. Test"
        }
      });
      console.log("Utente creato:", newUser.id);
    }

    // Trova il primo paziente
    let patient = await prisma.patient.findFirst();
    if (!patient) {
      console.log("Nessun paziente trovato. Creando paziente di test...");
      patient = await prisma.patient.create({
        data: {
          userId: user?.id || (await prisma.user.findFirst()).id,
          initials: "P.T.",
          notes: "Paziente di test per topic modeling"
        }
      });
      console.log("Paziente creato:", patient.id);
    }

    // Transcript di esempio per testing
    const transcripts = [
      {
        title: "Sessione 1 - Ansia e Stress",
        transcript: "Durante questa sessione il paziente ha parlato molto di ansia e stress lavorativo. Ha menzionato problemi con il capo e difficoltà nel gestire le scadenze. Si sente sopraffatto dalle responsabilità quotidiane e ha difficoltà a dormire la notte. Ha parlato anche di attacchi di panico ricorrenti e della paura di non essere all'altezza delle aspettative. Il paziente mostra segni evidenti di burnout professionale."
      },
      {
        title: "Sessione 2 - Trauma e Passato", 
        transcript: "Il paziente ha aperto il discorso sui ricordi dell'infanzia e su episodi traumatici del passato. Ha parlato di una famiglia disfunzionale e di episodi di violenza domestica. Mostra ancora oggi segni di disturbo post-traumatico e ha difficoltà nelle relazioni interpersonali. Ha menzionato sentimenti di vuoto interiore e bassa autostima. Durante la sessione sono emersi ricordi repressi che causano ancora dolore emotivo."
      },
      {
        title: "Sessione 3 - Tecniche di Rilassamento",
        transcript: "Oggi abbiamo lavorato su tecniche di rilassamento e mindfulness. Il paziente ha mostrato interesse verso la meditazione guidata e gli esercizi di respirazione profonda. Abbiamo praticato insieme alcune tecniche di grounding per gestire l'ansia. Ha riferito che gli esercizi di rilassamento progressivo lo aiutano a calmarsi. Abbiamo anche discusso dell'importanza della routine quotidiana e dell'esercizio fisico per il benessere mentale."
      },
      {
        title: "Sessione 4 - Relazioni e Autostima",
        transcript: "Il focus di oggi è stato sulle relazioni interpersonali e sui problemi di autostima. Il paziente ha difficoltà a stabilire confini sani nelle relazioni e tende a essere troppo accomodante. Ha parlato di una relazione tossica passata che ha influenzato la sua capacità di fidarsi degli altri. Mostra pattern di comportamento autosabotante e ha paura dell'abbandono. Abbiamo lavorato su tecniche per migliorare l'assertività e l'autovalutazione positiva."
      }
    ];

    // Crea le sessioni
    for (let i = 0; i < transcripts.length; i++) {
      const transcript = transcripts[i];
      
      const session = await prisma.session.create({
        data: {
          userId: user?.id || patient.userId,
          patientId: patient.id,
          title: transcript.title,
          transcript: transcript.transcript,
          sessionDate: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // Una al giorno negli ultimi 4 giorni
          status: "TRANSCRIBED",
          duration: 3600 // 1 ora
        }
      });
      
      console.log(`✅ Sessione creata: ${session.id} - ${session.title}`);
    }

    console.log("\n🎉 Tutte le sessioni di test sono state create!");
    console.log("Ora puoi testare il topic modeling nella pagina /sessions");

  } catch (error) {
    console.error("Errore durante la creazione delle sessioni:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSessions();
