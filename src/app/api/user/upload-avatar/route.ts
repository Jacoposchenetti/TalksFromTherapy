import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Client Supabase con service role per bypassare RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [Avatar Upload] Starting upload process...')
    
    // Verifica autenticazione
    const session = await getServerSession(authOptions)
    console.log('🔐 [Avatar Upload] Session:', session?.user?.id)
    
    if (!session?.user?.id) {
      console.log('❌ [Avatar Upload] No session found')
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    console.log('📁 [Avatar Upload] File received:', file?.name, file?.size)

    if (!file) {
      console.log('❌ [Avatar Upload] No file in form data')
      return NextResponse.json({ error: "Nessun file fornito" }, { status: 400 })
    }

    // Validazioni file
    if (file.size > 5 * 1024 * 1024) { // 5MB
      console.log('❌ [Avatar Upload] File too large:', file.size)
      return NextResponse.json({ error: "Il file deve essere inferiore a 5MB" }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      console.log('❌ [Avatar Upload] Invalid file type:', file.type)
      return NextResponse.json({ error: "Il file deve essere un'immagine" }, { status: 400 })
    }

    console.log('✅ [Avatar Upload] File validation passed')

    // Usa il client admin direttamente per storage e database
    const supabase = supabaseAdmin

    // Genera nome file unico
    const fileExtension = file.name.split('.').pop()
    const fileName = `${session.user.id}-${Date.now()}.${fileExtension}`
    const filePath = `avatars/${fileName}`
    console.log('📝 [Avatar Upload] Generated file path:', filePath)

    // Converti file in ArrayBuffer
    const fileBuffer = await file.arrayBuffer()
    console.log('🔄 [Avatar Upload] File converted to buffer, size:', fileBuffer.byteLength)

    // Carica file su Supabase Storage
    console.log('☁️ [Avatar Upload] Uploading to Supabase Storage...')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profilepictures')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('❌ [Avatar Upload] Storage upload error:', uploadError)
      return NextResponse.json({ error: "Errore durante il caricamento dell'immagine" }, { status: 500 })
    }

    console.log('✅ [Avatar Upload] Storage upload successful:', uploadData)

    // Ottieni URL pubblico
    const { data: { publicUrl } } = supabase.storage
      .from('profilepictures')
      .getPublicUrl(filePath)
    
    console.log('🔗 [Avatar Upload] Public URL generated:', publicUrl)

    // Aggiorna il profilo utente nel database con il nuovo avatar
    console.log('💾 [Avatar Upload] Updating user database record...')
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ image: publicUrl })
      .eq('id', session.user.id)

    if (updateError) {
      console.error('❌ [Avatar Upload] Database update error:', updateError)
      // Non bloccare se l'upload è riuscito ma l'aggiornamento DB fallisce
      return NextResponse.json({ 
        error: "Immagine caricata ma errore aggiornamento profilo",
        details: updateError 
      }, { status: 500 })
    }

    console.log('✅ [Avatar Upload] Database update successful')
    console.log('🎉 [Avatar Upload] Process completed successfully')

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: "Immagine caricata con successo"
    })

  } catch (error) {
    console.error('💥 [Avatar Upload] Unexpected error:', error)
    return NextResponse.json({ error: "Errore interno del server", details: error }, { status: 500 })
  }
}
