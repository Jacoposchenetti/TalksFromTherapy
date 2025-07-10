const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

/**
 * TEST SISTEMA DI CRITTOGRAFIA
 * Replica le funzioni di encryption.ts per testare la funzionalità
 */

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

function getMasterKey() {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_MASTER_KEY non configurata nell\'environment');
  }
  if (key.length < 32) {
    throw new Error('ENCRYPTION_MASTER_KEY deve essere almeno 32 caratteri');
  }
  return key;
}

function encryptSensitiveData(plaintext) {
  if (!plaintext || plaintext.trim() === '') {
    return '';
  }

  try {
    const masterKey = getMasterKey();
    
    // Genera salt e IV casuali
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Deriva la chiave
    const key = deriveKey(masterKey, salt);
    
    // Cripta
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combina salt + iv + encrypted (senza tag per CBC)
    const combined = Buffer.concat([
      salt,
      iv,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Errore crittografia:', error);
    throw new Error('Errore durante la crittografia dei dati');
  }
}

function decryptSensitiveData(encryptedData) {
  if (!encryptedData || encryptedData.trim() === '') {
    return '';
  }

  try {
    const masterKey = getMasterKey();
    
    // Decodifica da base64
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Estrae i componenti
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH);
    
    // Deriva la chiave
    const key = deriveKey(masterKey, salt);
    
    // Decripta
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Errore decrittografia:', error);
    throw new Error('Errore durante la decrittografia dei dati');
  }
}

function testEncryption() {
  try {
    console.log('🔐 TEST SISTEMA DI CRITTOGRAFIA');
    console.log('================================');
    
    // Verifica chiave master
    console.log('1. Verifica chiave master...');
    const masterKey = getMasterKey();
    console.log('   ✅ Chiave master configurata:', masterKey.length, 'caratteri');
    
    // Test base
    console.log('\n2. Test crittografia base...');
    const testData = "Questo è un test di crittografia per dati sensibili del paziente";
    console.log('   Input:', testData.substring(0, 50) + '...');
    
    const encrypted = encryptSensitiveData(testData);
    console.log('   Criptato:', encrypted.substring(0, 50) + '...');
    console.log('   Lunghezza criptata:', encrypted.length);
    
    const decrypted = decryptSensitiveData(encrypted);
    console.log('   Decriptato:', decrypted.substring(0, 50) + '...');
    
    const match = testData === decrypted;
    console.log('   Match:', match ? '✅' : '❌');
    
    // Test con dati vuoti
    console.log('\n3. Test con dati vuoti...');
    const emptyEncrypted = encryptSensitiveData('');
    const emptyDecrypted = decryptSensitiveData('');
    console.log('   Stringa vuota criptata:', emptyEncrypted === '' ? '✅' : '❌');
    console.log('   Stringa vuota decriptata:', emptyDecrypted === '' ? '✅' : '❌');
    
    // Test con dati sensibili tipici
    console.log('\n4. Test con dati sensibili tipici...');
    const testCases = [
      "Il paziente ha riferito di provare ansia durante la notte",
      "Transcript della seduta: 'Mi sento molto stressato ultimamente'",
      "Note cliniche: Episodi di panico ricorrenti",
      "Analisi emotiva: prevalenza di tristezza e frustrazione"
    ];
    
    let allPassed = true;
    for (let i = 0; i < testCases.length; i++) {
      const original = testCases[i];
      const enc = encryptSensitiveData(original);
      const dec = decryptSensitiveData(enc);
      const passed = original === dec;
      console.log(`   Test ${i + 1}:`, passed ? '✅' : '❌');
      if (!passed) {
        allPassed = false;
        console.log(`     Originale: ${original}`);
        console.log(`     Decriptato: ${dec}`);
      }
    }
    
    console.log('\n5. Risultato finale...');
    const finalResult = match && allPassed;
    console.log('   🎯 Test completo:', finalResult ? '✅ SUCCESSO' : '❌ FALLITO');
    
    return finalResult;
  } catch (error) {
    console.error('❌ Test crittografia fallito:', error);
    return false;
  }
}

// Esegui il test
console.log('Avvio test crittografia...\n');
const result = testEncryption();
console.log('\n🏁 Risultato finale:', result ? 'SUCCESSO' : 'FALLITO');
process.exit(result ? 0 : 1);
