// Test per verificare se la tabella session_notes esiste
const testTable = async () => {
  try {
    const response = await fetch('/api/sessions/test-session-id/note')
    console.log('Response status:', response.status)
    const data = await response.text()
    console.log('Response data:', data)
  } catch (error) {
    console.error('Error:', error)
  }
}

testTable()
