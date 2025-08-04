// Test script per verificare l'upload di file .txt
const fs = require('fs');
const path = require('path');

async function testTextFileUpload() {
  try {
    console.log('🧪 Testing text file upload...');
    
    // Leggi il file di test
    const filePath = path.join(__dirname, 'test-file.txt');
    const fileContent = fs.readFileSync(filePath);
    
    // Crea un FormData con il file
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', fileContent, {
      filename: 'test-file.txt',
      contentType: 'text/plain'
    });
    
    console.log('📋 FormData prepared with file:', {
      filename: 'test-file.txt',
      size: fileContent.length,
      contentType: 'text/plain'
    });
    
    // Simula una richiesta all'API
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:3001/api/parse-document', {
      method: 'POST',
      headers: {
        'Cookie': 'next-auth.session-token=your-session-token-here', // Dovrai sostituire con un token valido
        ...formData.getHeaders()
      },
      body: formData
    });
    
    const responseText = await response.text();
    console.log('📤 Response status:', response.status);
    console.log('📤 Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('📤 Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Upload successful!');
    } else {
      console.log('❌ Upload failed!');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testTextFileUpload();
