// Script di test per verificare l'upload dei file
// Eseguire da browser console quando si è sulla pagina dell'applicazione

function testFileUpload() {
    console.log('Testando l\'upload di diversi tipi di file...');
    
    // Simula l'upload di un file di testo
    const textFile = new File(['Questo è un test di contenuto.'], 'test.txt', { type: 'text/plain' });
    
    // Test dell'API
    const formData = new FormData();
    formData.append('file', textFile);
    
    fetch('/api/parse-document', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('Risposta API per file TXT:', data);
    })
    .catch(error => {
        console.error('Errore durante il test TXT:', error);
    });
}

// Funzione per testare file PDF vuoto (per testare la gestione errori)
function testEmptyPdf() {
    // Crea un file PDF minimo (non valido, per testare la gestione errori)
    const pdfFile = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', pdfFile);
    
    fetch('/api/parse-document', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('Risposta API per file PDF:', data);
    })
    .catch(error => {
        console.error('Errore durante il test PDF:', error);
    });
}

console.log('Script di test caricato. Esegui testFileUpload() per testare.');
console.log('I test reali dovranno essere fatti con file veri nell\'interfaccia utente.');
