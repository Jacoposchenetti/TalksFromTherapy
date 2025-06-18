// Test script for patient analysis functionality
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:3000';

async function testPatientAnalysis() {
  try {
    console.log('🧪 Testing Patient Analysis API...');
    
    // Test 1: Get patients list
    console.log('\n1. Testing patients list API...');
    const patientsResponse = await fetch(`${baseUrl}/api/patients`);
    const patientsData = await patientsResponse.json();
    console.log('✅ Patients API response:', patientsData);
    
    if (patientsData.patients && patientsData.patients.length > 0) {
      const testPatientId = patientsData.patients[0].id;
      console.log(`\n📋 Using test patient ID: ${testPatientId}`);
      
      // Test 2: Get specific patient with sessions
      console.log('\n2. Testing specific patient API...');
      const patientResponse = await fetch(`${baseUrl}/api/patients/${testPatientId}`);
      const patientData = await patientResponse.json();
      console.log('✅ Patient API response:', JSON.stringify(patientData, null, 2));
      
      // Test 3: Test sliding window analysis if patient has sessions with transcripts
      if (patientData.patient && patientData.patient.sessions) {
        const sessionsWithTranscript = patientData.patient.sessions.filter(
          s => s.transcript && s.transcript.length > 50
        );
        
        if (sessionsWithTranscript.length > 0) {
          const testSessionId = sessionsWithTranscript[0].id;
          const testTranscript = sessionsWithTranscript[0].transcript;
          
          console.log(`\n3. Testing sliding window analysis for session ${testSessionId}...`);
          
          const analysisResponse = await fetch(`${baseUrl}/api/single-session-analysis`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: testSessionId,
              transcript: testTranscript,
            }),
          });
          
          if (analysisResponse.ok) {
            const analysisData = await analysisResponse.json();
            console.log('✅ Sliding window analysis response:', JSON.stringify(analysisData, null, 2));
          } else {
            console.log('❌ Sliding window analysis failed:', analysisResponse.status, analysisResponse.statusText);
            const errorText = await analysisResponse.text();
            console.log('Error details:', errorText);
          }
        } else {
          console.log('⚠️  No sessions with transcripts found for testing sliding window analysis');
        }
      }
    } else {
      console.log('⚠️  No patients found in database');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPatientAnalysis();
