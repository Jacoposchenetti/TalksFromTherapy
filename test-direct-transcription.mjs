// Test diretto della funzione transcribeAudio senza l'API
import { transcribeAudio } from '../src/lib/openai.js';

async function testDirectTranscription() {
  console.log('🎯 Testing transcribeAudio function directly...');
  
  try {
    // Crea un buffer audio di test molto piccolo
    const dummyAudioBuffer = Buffer.from([
      82, 73, 70, 70, 100, 0, 0, 0, 87, 65, 86, 69, 102, 109, 116, 32,
      16, 0, 0, 0, 1, 0, 1, 0, 68, 172, 0, 0, 136, 88, 1, 0,
      2, 0, 16, 0, 100, 97, 116, 97, 68, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]);
    
    console.log('📁 Buffer size:', dummyAudioBuffer.length, 'bytes');
    
    const result = await transcribeAudio(dummyAudioBuffer, 'test-recording.wav');
    
    console.log('✅ Transcription successful!');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('❌ Direct transcription failed:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testDirectTranscription();
