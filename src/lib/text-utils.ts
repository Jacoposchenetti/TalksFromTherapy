// Estrae solo il parlato del paziente da una trascrizione
// Funziona sia con trascrizioni etichettate (es: "PAZIENTE:", "TERAPEUTA:") che senza
export function extractPatientContent(transcript: string): string {
  if (!transcript) return '';
  // Cerca pattern tipo "PAZIENTE:" o "P:" (case insensitive)
  const patientRegex = /^(PAZIENTE|P):\s*(.*)$/gim;
  let result = '';
  let match;
  while ((match = patientRegex.exec(transcript)) !== null) {
    result += match[2] + '\n';
  }
  // Se non trova nulla, restituisce tutto il testo
  return result.trim() || transcript.trim();
} 