// Test script per la funzionalità di diarizzazione
// Esegui con: node test-diarization.js

const testTranscript = `
Buongiorno, come si sente oggi?
Bene, grazie. Ho fatto i compiti che mi aveva dato.
Ottimo, mi racconti come è andata?
Beh, all'inizio è stato difficile, ma poi ho capito che dovevo essere più paziente con me stesso.
Questo è un ottimo progresso. Cosa ha notato di diverso?
Ho notato che quando mi arrabbio, invece di reagire subito, riesco a fermarmi un attimo e pensare.
E come si sente quando riesce a fare questo?
Mi sento più in controllo, più calmo. È come se avessi più potere sulle mie emozioni.
Questo è davvero importante. Ha notato altri cambiamenti?
Sì, anche nel sonno. Dormo meglio e mi sveglio più riposato.
Molto bene. Questi sono segnali positivi che indicano che il lavoro che stiamo facendo sta funzionando.
Sì, lo sento anch'io. Grazie per avermi aiutato.
Il merito è tutto suo. Lei sta facendo il lavoro più importante.
`;

console.log('=== TEST DIARIZZAZIONE ===');
console.log('Trascrizione di test:');
console.log(testTranscript);
console.log('\n=== RISULTATO ATTESO ===');
console.log('La diarizzazione dovrebbe identificare:');
console.log('- Terapeuta: domande, commenti professionali, feedback');
console.log('- Paziente: risposte personali, esperienze, emozioni');
console.log('\n=== FORMATO OUTPUT ATTESO ===');
console.log('Terapeuta: Buongiorno, come si sente oggi?');
console.log('Paziente: Bene, grazie. Ho fatto i compiti che mi aveva dato.');
console.log('Terapeuta: Ottimo, mi racconti come è andata?');
console.log('Paziente: Beh, all\'inizio è stato difficile...');
console.log('\n=== NOTE ===');
console.log('- Il sistema dovrebbe identificare automaticamente i cambi di interlocutore');
console.log('- Dovrebbe mantenere tutto il contenuto originale');
console.log('- Dovrebbe aggiungere solo i prefissi "Terapeuta:" e "Paziente:"');
console.log('- La diarizzazione avviene dopo la trascrizione iniziale con Whisper');
console.log('- È disponibile anche un pulsante per diarizzare trascrizioni esistenti'); 