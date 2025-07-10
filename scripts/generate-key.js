const crypto = require('crypto');

/**
 * GENERATORE CHIAVI SICURE PER TALKSFROMTHERAPY
 * Genera chiavi di crittografia per diversi ambienti
 */

function generateSecureKey(length = 64, environment = 'production') {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  let key = '';
  
  // Genera caratteri casuali crittograficamente sicuri
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    key += charset[randomIndex];
  }
  
  return key;
}

function generateKeyWithPrefix(environment) {
  const prefix = {
    development: 'Dev2025!',
    staging: 'Stage2025!',
    production: 'Prod2025!'
  };
  
  const baseKey = generateSecureKey(52, environment);
  return `${prefix[environment]}${baseKey}`;
}

function main() {
  const args = process.argv.slice(2);
  const environment = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'production';
  const length = parseInt(args.find(arg => arg.startsWith('--length='))?.split('=')[1]) || 64;
  
  console.log('🔐 GENERATORE CHIAVI SICURE - TalksFromTherapy');
  console.log('===============================================');
  console.log(`Ambiente: ${environment.toUpperCase()}`);
  console.log(`Lunghezza: ${length} caratteri`);
  console.log('');
  
  const newKey = generateKeyWithPrefix(environment);
  
  console.log('🔑 NUOVA CHIAVE GENERATA:');
  console.log('------------------------');
  console.log(`ENCRYPTION_MASTER_KEY=${newKey}`);
  console.log('');
  
  console.log('📋 PROSSIMI STEP:');
  console.log('1. Copia la chiave sopra');
  console.log('2. Salvala in Bitwarden');
  console.log(`3. Aggiorna la variabile d'ambiente ${environment}`);
  console.log('4. Se è produzione, esegui test di crittografia');
  console.log('5. Se sostituisci una chiave esistente, usa lo script di rotazione');
  console.log('');
  
  console.log('⚠️  IMPORTANTE:');
  console.log('- Non condividere questa chiave via email/chat');
  console.log('- Salvala immediatamente in Bitwarden');
  console.log('- Non commitarla nel repository Git');
  console.log('- Fai backup sicuro prima di sostituire chiavi esistenti');
  
  // Test della chiave generata
  console.log('');
  console.log('🧪 TEST VALIDITÀ CHIAVE:');
  console.log(`✅ Lunghezza: ${newKey.length} caratteri`);
  console.log(`✅ Contiene maiuscole: ${/[A-Z]/.test(newKey)}`);
  console.log(`✅ Contiene minuscole: ${/[a-z]/.test(newKey)}`);
  console.log(`✅ Contiene numeri: ${/[0-9]/.test(newKey)}`);
  console.log(`✅ Contiene simboli: ${/[!@#$%^&*()_+\-=]/.test(newKey)}`);
  console.log(`✅ Sicurezza: ${newKey.length >= 52 ? 'ALTA' : 'MEDIA'}`);
}

// Mostra help se richiesto
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🔐 GENERATORE CHIAVI SICURE

Uso:
  node scripts/generate-key.js [opzioni]

Opzioni:
  --env=AMBIENTE     Ambiente: development, staging, production (default: production)
  --length=NUMERO    Lunghezza chiave (default: 64)
  --help, -h         Mostra questo aiuto

Esempi:
  node scripts/generate-key.js
  node scripts/generate-key.js --env=staging
  node scripts/generate-key.js --env=production --length=96
  `);
  process.exit(0);
}

// Esegui se chiamato direttamente
if (require.main === module) {
  main();
}

module.exports = { generateSecureKey, generateKeyWithPrefix };
