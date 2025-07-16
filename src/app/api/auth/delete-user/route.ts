import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'

export async function DELETE(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email richiesta' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role per eliminare utenti
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

    // Elimina dalla tabella users personalizzata
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('email', email)

    if (deleteUserError) {
      console.error('Error deleting from users table:', deleteUserError)
    }

    // Prima trova l'ID utente tramite email
    const { data: usersData } = await supabase.auth.admin.listUsers()
    const userToDelete = usersData?.users.find(user => user.email === email)
    
    if (!userToDelete) {
      return NextResponse.json({ 
        error: 'Utente non trovato nel sistema di autenticazione' 
      }, { status: 404 })
    }

    // Elimina dalla tabella auth.users
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userToDelete.id)

    if (deleteAuthError) {
      console.error('Error deleting from auth.users:', deleteAuthError)
      return NextResponse.json({ 
        error: 'Errore durante l\'eliminazione dall\'autenticazione',
        details: deleteAuthError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Utente eliminato completamente',
      email 
    })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
