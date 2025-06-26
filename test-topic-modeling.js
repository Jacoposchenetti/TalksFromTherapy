// Test per topic modeling GPT
// Esegui questo file con: node test-topic-modeling.js

const testTranscripts = [
  {
    id: "1",
    content: "Durante la sessione il paziente ha parlato di ansia e stress. Ha menzionato problemi di lavoro e difficoltà nelle relazioni interpersonali. Si sente spesso sopraffatto dalle responsabilità quotidiane."
  },
  {
    id: "2", 
    content: "Il paziente ha discusso della sua infanzia e dei ricordi traumatici. Ha parlato di episodi di depressione e della sensazione di vuoto interiore. Mostra segni di bassa autostima."
  },
  {
    id: "3",
    content: "Oggi abbiamo lavorato sulle tecniche di rilassamento e mindfulness. Il paziente ha mostrato interesse verso la meditazione e gli esercizi di respirazione per gestire lo stress."
  }
];

console.log("Test transcript per topic modeling:");
console.log("Transcript 1:", testTranscripts[0].content.substring(0, 100) + "...");
console.log("Transcript 2:", testTranscripts[1].content.substring(0, 100) + "...");
console.log("Transcript 3:", testTranscripts[2].content.substring(0, 100) + "...");

console.log("\nTopic che potrebbero essere identificati:");
console.log("- Ansia Stress");
console.log("- Trauma Infanzia");  
console.log("- Tecniche Rilassamento");

// Simula una risposta GPT
const mockGPTResponse = `
TEMA 1: Ansia Stress
PAROLE: ansia, stress, sopraffatto, responsabilità, lavoro, preoccupazione

TEMA 2: Trauma Infanzia
PAROLE: trauma, infanzia, depressione, vuoto, autostima, ricordi

TEMA 3: Tecniche Rilassamento  
PAROLE: rilassamento, mindfulness, meditazione, respirazione, tecniche, gestione
`;

console.log("\nRisposta GPT simulata:");
console.log(mockGPTResponse);
