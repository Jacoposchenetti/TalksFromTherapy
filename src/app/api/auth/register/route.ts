import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { hashPassword } from "@/lib/password"

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, licenseNumber } = await request.json()

    // Validazione base
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e password sono obbligatori" },
        { status: 400 }
      )
    }

    // Validazione email formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato email non valido" },
        { status: 400 }
      )
    }

    // Validazione password lunghezza
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La password deve essere di almeno 8 caratteri" },
        { status: 400 }
      )
    }

    // Controlla se l'email esiste già
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[Supabase] User check error:', checkError)
      return NextResponse.json(
        { error: "Errore durante il controllo utente" },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utente con questa email esiste già" },
        { status: 409 }
      )
    }

    // Hash della password
    const hashedPassword = await hashPassword(password)

    // Crea l'utente su Supabase
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert([{
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        licenseNumber: licenseNumber || null
      }])
      .select('id, name, email, licenseNumber, createdAt')
      .single()

    if (createError) {
      console.error('[Supabase] User creation error:', createError)
      return NextResponse.json(
        { error: "Errore durante la creazione utente" },
        { status: 500 }
      )
    }

    console.log('[Supabase] User created successfully:', user.id)

    return NextResponse.json(
      { 
        message: "Utente creato con successo",
        user 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Errore durante la registrazione:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
