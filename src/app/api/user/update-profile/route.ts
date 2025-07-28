export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, licenseNumber, image } = body

    // Validazioni
    if (!name || !email) {
      return NextResponse.json({ error: "Nome e email sono obbligatori" }, { status: 400 })
    }

    // Crea client Supabase
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Aggiorna i dati utente nella tabella users
    const { error: updateError } = await supabase
      .from('users')
      .update({
        name,
        email,
        phone: phone || null,
        license_number: licenseNumber || null,
        image: image || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)

    if (updateError) {
      console.error('User update error:', updateError)
      return NextResponse.json({ error: "Errore durante l'aggiornamento del profilo" }, { status: 500 })
    }

    // Aggiorna anche i metadati utente in Supabase Auth se necessario
    try {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
        session.user.id,
        {
          user_metadata: {
            name,
            phone: phone || null,
            license_number: licenseNumber || null
          }
        }
      )

      if (authUpdateError) {
        console.warn('Auth metadata update warning:', authUpdateError)
        // Non blocchiamo l'operazione per questo errore
      }
    } catch (authError) {
      console.warn('Auth update warning:', authError)
      // Non blocchiamo l'operazione per questo errore
    }

    return NextResponse.json({
      success: true,
      message: "Profilo aggiornato con successo"
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
