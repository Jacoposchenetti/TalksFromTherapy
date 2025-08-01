const { createClient } = require('@supabase/supabase-js')

// Client Supabase con service role per operazioni admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixSessionStatus() {
  try {
    console.log('🔍 Controllo sessioni in stato ERROR...')
    
    // Trova tutte le sessioni in stato ERROR
    const { data: errorSessions, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('status', 'ERROR')
      .eq('isActive', true)
    
    if (fetchError) {
      console.error('❌ Errore nel recupero sessioni:', fetchError)
      return
    }
    
    console.log(`📊 Trovate ${errorSessions.length} sessioni in stato ERROR`)
    
    for (const session of errorSessions) {
      console.log(`\n🔍 Controllo sessione: ${session.id}`)
      console.log(`   - Title: ${session.title}`)
      console.log(`   - Audio file: ${session.audioFileName}`)
      console.log(`   - Status: ${session.status}`)
      
      if (session.audioFileName) {
        // Verifica se il file esiste su Supabase Storage
        const filePath = `${session.userId}/${session.audioFileName}`
        
        try {
          const { data: fileData, error: fileError } = await supabaseAdmin.storage
            .from('talksfromtherapy')
            .list(session.userId, {
              search: session.audioFileName
            })
          
          if (fileError) {
            console.log(`   ❌ Errore nel controllo file: ${fileError.message}`)
            continue
          }
          
          const fileExists = fileData && fileData.length > 0
          console.log(`   📁 File esistente: ${fileExists ? 'SÌ' : 'NO'}`)
          
          if (fileExists) {
            // Il file esiste, aggiorniamo lo stato a UPLOADED
            const { error: updateError } = await supabaseAdmin
              .from('sessions')
              .update({ status: 'UPLOADED' })
              .eq('id', session.id)
            
            if (updateError) {
              console.log(`   ❌ Errore nell'aggiornamento: ${updateError.message}`)
            } else {
              console.log(`   ✅ Status aggiornato a UPLOADED`)
            }
          } else {
            console.log(`   ⚠️ File non trovato, sessione rimane in ERROR`)
          }
        } catch (storageError) {
          console.log(`   ❌ Errore storage: ${storageError.message}`)
        }
      } else {
        console.log(`   ⚠️ Nessun audioFileName specificato`)
      }
    }
    
    console.log('\n✅ Controllo completato!')
    
  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

// Esegui lo script
fixSessionStatus()
