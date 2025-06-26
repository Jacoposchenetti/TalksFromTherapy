// Test per l'API topic modeling
// Esegui questo file con: node test-api-topics.js

const testData = {
  transcriptIds: ["test-id-1"],
  maxTopics: 3
};

async function testTopicAPI() {
  try {
    console.log("Testing topic modeling API...");
    
    const response = await fetch('http://localhost:3000/api/topics/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log("Response status:", response.status);
    
    const data = await response.json();
    console.log("Response data:", JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error("Error testing API:", error);
  }
}

// Attendi che il server sia pronto
setTimeout(() => {
  testTopicAPI();
}, 3000);

console.log("Waiting for server to start...");
