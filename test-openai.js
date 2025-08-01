// Test diagnostico per OpenAI API
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  console.log('🔑 Testing OpenAI API Key...');
  console.log('API Key:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 20)}...` : 'NOT SET');
  
  try {
    // Test 1: Verifica che la chiave API sia valida
    console.log('\n📝 Test 1: Checking API Key validity...');
    const models = await openai.models.list();
    console.log('✅ API Key is valid!');
    console.log(`📊 Available models: ${models.data.length}`);
    
    // Test 2: Verifica che Whisper sia disponibile
    console.log('\n🎵 Test 2: Checking Whisper availability...');
    const whisperModel = models.data.find(model => model.id === 'whisper-1');
    if (whisperModel) {
      console.log('✅ Whisper-1 model is available!');
    } else {
      console.log('❌ Whisper-1 model is NOT available!');
    }
    
    // Test 3: Verifica che GPT-3.5-turbo sia disponibile
    console.log('\n🤖 Test 3: Checking GPT-3.5-turbo availability...');
    const gptModel = models.data.find(model => model.id === 'gpt-3.5-turbo');
    if (gptModel) {
      console.log('✅ GPT-3.5-turbo model is available!');
    } else {
      console.log('❌ GPT-3.5-turbo model is NOT available!');
    }
    
    // Test 4: Test semplice chat completion
    console.log('\n💬 Test 4: Testing simple chat completion...');
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: 'Say hello in Italian' }],
      model: 'gpt-3.5-turbo',
      max_tokens: 10,
    });
    console.log('✅ Chat completion successful!');
    console.log('Response:', completion.choices[0].message.content);
    
    console.log('\n🎉 All tests passed! OpenAI API is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.status === 401) {
      console.error('🔑 Invalid API key! Please check your OPENAI_API_KEY in .env file');
    } else if (error.status === 429) {
      console.error('⏰ Rate limit reached! Possible causes:');
      console.error('  - Too many requests in short time');
      console.error('  - Free tier limits exceeded');
      console.error('  - Organization limits reached');
      console.error('  - Project limits reached');
    } else if (error.status === 403) {
      console.error('🚫 Access forbidden! Your API key might not have access to the requested model');
    } else {
      console.error('🔍 Full error details:', error);
    }
  }
}

testOpenAI();
