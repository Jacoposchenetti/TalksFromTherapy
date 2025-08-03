// Test per verificare se l'oggetto File è disponibile nell'ambiente Node.js
console.log('🔍 Checking File object availability...');

console.log('typeof File:', typeof File);
console.log('File available:', typeof File !== 'undefined');

if (typeof File === 'undefined') {
  console.log('❌ File object is NOT available in this Node.js environment!');
  console.log('💡 This is likely the cause of the 500 error.');
  
  // Test con FormData che dovrebbe essere disponibile
  console.log('typeof FormData:', typeof FormData);
  console.log('FormData available:', typeof FormData !== 'undefined');
  
  console.log('\n🛠️ Possible solutions:');
  console.log('1. Use FormData.append() instead of File constructor');
  console.log('2. Use fs.createReadStream() for file uploads');
  console.log('3. Install and use node-fetch polyfill');
  
} else {
  console.log('✅ File object is available!');
  
  // Test creating a File object
  try {
    const testBuffer = Buffer.from('test data');
    const testFile = new File([testBuffer], 'test.txt', { type: 'text/plain' });
    console.log('✅ File object creation successful!');
    console.log('File name:', testFile.name);
    console.log('File size:', testFile.size);
    console.log('File type:', testFile.type);
  } catch (error) {
    console.log('❌ File object creation failed:', error.message);
  }
}
