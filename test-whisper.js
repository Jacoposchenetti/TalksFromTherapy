// Test specifico per Whisper (il modello che davvero ci serve)
const OpenAI = require('openai');
require('dotenv').config();
const fs = require('fs');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testWhisperSpecific() {
  console.log('🎵 Testing Whisper specifically...');
  
  try {
    // Creiamo un file audio di test molto piccolo (silenzio di 1 secondo)
    // Questo è un file WAV vuoto di 1 secondo
    const dummyAudioBuffer = Buffer.from([
      82, 73, 70, 70, 100, 0, 0, 0, 87, 65, 86, 69, 102, 109, 116, 32,
      16, 0, 0, 0, 1, 0, 1, 0, 68, 172, 0, 0, 136, 88, 1, 0,
      2, 0, 16, 0, 100, 97, 116, 97, 68, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0
    ]);
    
    // Salva il file temporaneo
    fs.writeFileSync('temp-test-audio.wav', dummyAudioBuffer);
    
    console.log('📝 Testing Whisper transcription with dummy audio...');
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream('temp-test-audio.wav'),
      model: 'whisper-1',
      language: 'it',
    });
    
    console.log('✅ Whisper transcription successful!');
    console.log('Result:', transcription.text || 'Empty/Silent audio detected');
    
    // Pulisci il file temporaneo
    fs.unlinkSync('temp-test-audio.wav');
    
    console.log('\n🎉 Whisper is working! The problem might be with Chat models only.');
    
  } catch (error) {
    console.error('\n❌ Whisper test failed:', error.message);
    
    // Pulisci il file temporaneo in caso di errore
    try {
      fs.unlinkSync('temp-test-audio.wav');
    } catch {}
    
    if (error.status === 429) {
      console.error('🚨 PROBLEMA CONFERMATO: Rate limit anche per Whisper!');
      console.error('   Questo è strano considerando il tuo budget disponibile...');
      console.error('   Possibili cause:');
      console.error('   1. Problema temporaneo di OpenAI');
      console.error('   2. Limiti specifici per progetto/organizzazione');
      console.error('   3. Chiave API associata a un progetto con limiti diversi');
    }
  }
}

testWhisperSpecific();
