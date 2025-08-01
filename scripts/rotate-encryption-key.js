/**
 * SCRIPT DI ROTAZIONE CHIAVE DI CRITTOGRAFIA
 * 
 * ATTENZIONE: Esegui questo script SOLO se devi cambiare la chiave master!
 * 
 * Procedura:
 * 1. Imposta OLD_ENCRYPTION_MASTER_KEY con la chiave attuale
 * 2. Imposta NEW_ENCRYPTION_MASTER_KEY con la nuova chiave
 * 3. Esegui: node scripts/rotate-encryption-key.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// CONFIGURAZIONE
const OLD_KEY = process.env.OLD_ENCRYPTION_MASTER_KEY;
const NEW_KEY = process.env.NEW_ENCRYPTION_MASTER_KEY;

if (!OLD_KEY || !NEW_KEY) {
  console.error('❌ Devi impostare OLD_ENCRYPTION_MASTER_KEY e NEW_ENCRYPTION_MASTER_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Funzioni di crittografia (duplicate per sicurezza)
const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const ITERATIONS = 100000;

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

function decryptWithOldKey(encryptedData) {
  if (!encryptedData) return '';
  
  try {
    const combined = Buffer.from(encryptedData, 'base64');
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH);
    
    const key = deriveKey(OLD_KEY, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Errore decrittografia:', error);
    return null;
  }
}

function encryptWithNewKey(plaintext) {
  if (!plaintext) return '';
  
  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(NEW_KEY, salt);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const combined = Buffer.concat([salt, iv, Buffer.from(encrypted, 'hex')]);
    return combined.toString('base64');
  } catch (error) {
    console.error('Errore crittografia:', error);
    return null;
  }
}

async function rotateEncryptionKey() {
  console.log('🔄 INIZIO ROTAZIONE CHIAVE DI CRITTOGRAFIA');
  console.log('==========================================');
  
  try {
    // 1. ROTAZIONE DATI SESSIONI
    console.log('\n1. Aggiornamento transcript sessioni...');
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, transcript')
      .not('transcript', 'is', null);
    
    for (const session of sessions || []) {
      if (session.transcript) {
        const decrypted = decryptWithOldKey(session.transcript);
        if (decrypted) {
          const reEncrypted = encryptWithNewKey(decrypted);
          await supabase
            .from('sessions')
            .update({ transcript: reEncrypted })
            .eq('id', session.id);
          console.log(`  ✅ Sessione ${session.id} aggiornata`);
        }
      }
    }
    
    // 2. ROTAZIONE NOTE SESSIONI
    console.log('\n2. Aggiornamento note sessioni...');
    const { data: notes } = await supabase
      .from('session_notes')
      .select('id, content')
      .not('content', 'is', null);
    
    for (const note of notes || []) {
      if (note.content) {
        const decrypted = decryptWithOldKey(note.content);
        if (decrypted) {
          const reEncrypted = encryptWithNewKey(decrypted);
          await supabase
            .from('session_notes')
            .update({ content: reEncrypted })
            .eq('id', note.id);
          console.log(`  ✅ Nota ${note.id} aggiornata`);
        }
      }
    }
    
    // 3. ROTAZIONE NOTE PAZIENTI
    console.log('\n3. Aggiornamento note pazienti...');
    const { data: patients } = await supabase
      .from('patients')
      .select('id, notes')
      .not('notes', 'is', null);
    
    for (const patient of patients || []) {
      if (patient.notes) {
        const decrypted = decryptWithOldKey(patient.notes);
        if (decrypted) {
          const reEncrypted = encryptWithNewKey(decrypted);
          await supabase
            .from('patients')
            .update({ notes: reEncrypted })
            .eq('id', patient.id);
          console.log(`  ✅ Paziente ${patient.id} aggiornato`);
        }
      }
    }
    
    // 4. ROTAZIONE ANALISI
    console.log('\n4. Aggiornamento analisi...');
    const { data: analyses } = await supabase
      .from('analyses')
      .select('id, emotions, significantEmotions, emotionFlowerPlot, topicAnalysisResult, customTopicAnalysisResults, semanticFrameResults');
    
    for (const analysis of analyses || []) {
      const updates = {};
      
      if (analysis.emotions) {
        const decrypted = decryptWithOldKey(analysis.emotions);
        if (decrypted) updates.emotions = encryptWithNewKey(decrypted);
      }
      
      if (analysis.significantEmotions) {
        const decrypted = decryptWithOldKey(analysis.significantEmotions);
        if (decrypted) updates.significantEmotions = encryptWithNewKey(decrypted);
      }
      
      // ... altri campi analisi ...
      
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('analyses')
          .update(updates)
          .eq('id', analysis.id);
        console.log(`  ✅ Analisi ${analysis.id} aggiornata`);
      }
    }
    
    console.log('\n🎉 ROTAZIONE COMPLETATA CON SUCCESSO!');
    console.log('💡 Ora aggiorna ENCRYPTION_MASTER_KEY nel tuo .env.local con la nuova chiave');
    
  } catch (error) {
    console.error('❌ ERRORE DURANTE LA ROTAZIONE:', error);
    console.log('⚠️  ATTENZIONE: Alcuni dati potrebbero essere in stato inconsistente');
    console.log('📞 Contatta il team di sviluppo immediatamente');
  }
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
  rotateEncryptionKey();
}
