import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const runtime = 'nodejs'

// GET /api/patients - Lista pazienti dell'utente autenticato
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', session.user.email)
    .single()
  if (userError || !userData) {
    console.error('[Supabase] User fetch error:', userError)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  const { data: patients, error } = await supabase
    .from('patients')
    .select('*')
    .eq('userId', userData.id)
    .eq('isActive', true)
    .order('createdAt', { ascending: false })
  if (error) {
    console.error('[Supabase] Patients fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ patients: patients || [] })
}

// POST /api/patients - Crea nuovo paziente
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', session.user.email)
    .single()
  if (userError || !userData) {
    console.error('[Supabase] User fetch error:', userError)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  const body = await request.json()
  const { data, error } = await supabase
    .from('patients')
    .insert([{ ...body, userId: userData.id }])
    .select()
  if (error) {
    console.error('[Supabase] Patient insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
