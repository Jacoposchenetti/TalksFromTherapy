// Test che simula esattamente quello che fa l'API transcribe-new
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function simulateTranscribeAPI() {
  console.log('🎯 Simulating exact API transcription process...');
  
  try {
    // Simula un buffer audio (come quello che viene da Supabase)
    const dummyAudioBuffer = Buffer.from([
      82, 73, 70, 70, 100, 0, 0, 0, 87, 65, 86, 69, 102, 109, 116, 32,
      16, 0, 0, 0, 1, 0, 1, 0, 68, 172, 0, 0, 136, 88, 1, 0,
      2, 0, 16, 0, 100, 97, 116, 97, 68, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0
    ]);
    
    const fileName = "test-recording.wav";
    
    console.log('📝 Creating File object...');
    // Stesso codice che usiamo nell'API
    const audioFile = new File([dummyAudioBuffer], fileName, { 
      type: 'audio/mpeg' // Tipo generico per audio
    });
    
    console.log('✅ File object created successfully');
    console.log('File name:', audioFile.name);
    console.log('File size:', audioFile.size);
    console.log('File type:', audioFile.type);
    
    console.log('🎵 Calling OpenAI Whisper API...');
    
    // Stessa chiamata che facciamo nell'API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'it', // Italiano
      response_format: 'verbose_json', // Più dettagli nella risposta
      temperature: 0.0, // Massima accuratezza
      prompt: "Trascrivi accuratamente tutto il parlato in italiano. Includi tutte le voci, pause e parlato sovrapposto. Ignora rumori di fondo, musiche o watermark."
    });
    
    console.log('✅ Transcription successful!');
    console.log('Result:', transcription.text || 'Empty/Silent audio');
    
  } catch (error) {
    console.error('❌ Error occurred:', error.message);
    console.error('Error type:', error.constructor.name);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);
    
    // Log dello stack trace completo per debug
    console.error('Full error object:', error);
    
    // Simula la gestione degli errori che abbiamo nel codice
    console.log('\n🛠️ Error handling simulation:');
    
    const errorString = error.toString().toLowerCase();
    const message = error.message?.toLowerCase() || '';
    
    const isRetryable = (
      errorString.includes('rate limit') ||
      errorString.includes('429') ||
      message.includes('rate limit') ||
      error.status === 429 ||
      error.code === 'rate_limit_exceeded'
    );
    
    const isQuota = (
      errorString.includes('insufficient_quota') ||
      message.includes('insufficient_quota') ||
      error.code === 'insufficient_quota' ||
      error.type === 'insufficient_quota'
    );
    
    console.log('Is retryable error:', isRetryable);
    console.log('Is quota error:', isQuota);
    
    if (isQuota) {
      console.log('🚨 Would throw: Quota OpenAI esaurita');
    } else if (isRetryable) {
      console.log('🚨 Would throw: Rate limit OpenAI raggiunto');
    } else {
      console.log('🚨 Would throw: Error during transcription');
    }
  }
}

simulateTranscribeAPI();
