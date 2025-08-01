// Test più approfondito per verificare se il problema è nel nostro codice
const OpenAI = require('openai');
require('dotenv').config();

console.log('🔧 DEBUGGING DELLA CONFIGURAZIONE...\n');

// 1. Controllo variabili ambiente
console.log('📋 Environment variables:');
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0);
console.log('OPENAI_API_KEY starts with sk-:', process.env.OPENAI_API_KEY?.startsWith('sk-'));
console.log('OPENAI_API_KEY preview:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');

// 2. Controllo configurazione OpenAI client
console.log('\n⚙️ OpenAI Client Configuration:');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log('Client created successfully:', !!openai);

// 3. Test con headers manuali per vedere la risposta completa
console.log('\n🌐 Testing with manual HTTP request...');

async function testWithFetch() {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'OpenAI/NodeJS'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Models fetched successfully via fetch!');
      console.log('Number of models:', data.data?.length || 0);
      
      // Test con una richiesta molto semplice
      console.log('\n🧪 Testing simple chat completion via fetch...');
      const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        })
      });
      
      console.log('Chat response status:', chatResponse.status);
      console.log('Chat response headers:', Object.fromEntries(chatResponse.headers.entries()));
      
      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        console.log('✅ Chat completion successful via fetch!');
        console.log('Response:', chatData.choices?.[0]?.message?.content);
      } else {
        const errorData = await chatResponse.text();
        console.log('❌ Chat completion failed via fetch');
        console.log('Error response:', errorData);
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ Models fetch failed');
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Fetch test failed:', error.message);
  }
}

// 4. Test con OpenAI SDK
async function testWithSDK() {
  console.log('\n🔧 Testing with OpenAI SDK...');
  try {
    console.log('Attempting to list models...');
    const models = await openai.models.list();
    console.log('✅ Models listed successfully with SDK!');
    
    console.log('Attempting chat completion...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5
    });
    console.log('✅ Chat completion successful with SDK!');
    console.log('Response:', completion.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ SDK test failed:', error.message);
    console.error('Error details:', {
      status: error.status,
      code: error.code,
      type: error.type,
      headers: error.headers ? Object.fromEntries(error.headers.entries()) : 'No headers'
    });
  }
}

// Esegui tutti i test
async function runAllTests() {
  await testWithFetch();
  await testWithSDK();
}

runAllTests();
