// Estrae solo il parlato del paziente da una trascrizione
// Funziona sia con trascrizioni etichettate (es: "PAZIENTE:", "TERAPEUTA:") che senza
export function extractPatientContent(transcript: string): string {
  if (!transcript) return '';
  
  // Pattern più flessibili per identificare il contenuto del paziente
  const patientPatterns = [
    /(?:^|\n)(PAZIENTE|P|Paziente):\s*(.*?)(?=\n(?:TERAPEUTA|T|Terapeuta):|$)/gis,
    /(?:^|\n)(PAZIENTE|P|Paziente):\s*(.*?)(?=\n[A-Z]+:|$)/gis
  ];
  
  let result = '';
  
  // Prova tutti i pattern
  for (const pattern of patientPatterns) {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      if (match[2] && match[2].trim()) {
        result += match[2].trim() + '\n';
      }
    }
  }
  
  // Se non trova nulla con i pattern, prova un approccio più semplice
  if (!result.trim()) {
    const lines = transcript.split('\n');
    let isPatientSection = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Identifica se siamo in una sezione del paziente
      if (/^(PAZIENTE|P|Paziente):/i.test(trimmedLine)) {
        isPatientSection = true;
        // Aggiungi il contenuto dopo il marker
        const content = trimmedLine.replace(/^(PAZIENTE|P|Paziente):\s*/i, '').trim();
        if (content) {
          result += content + '\n';
        }
      } else if (/^(TERAPEUTA|T|Terapeuta):/i.test(trimmedLine)) {
        isPatientSection = false;
      } else if (isPatientSection && trimmedLine) {
        // Aggiungi il contenuto se siamo in una sezione del paziente
        result += trimmedLine + '\n';
      }
    }
  }
  
  // Se ancora non trova nulla, restituisce tutto il testo
  return result.trim() || transcript.trim();
} 