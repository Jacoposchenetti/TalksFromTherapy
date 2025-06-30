import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  // Prendi tutte le sessioni che hanno una trascrizione
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, transcript, sessionDate, patientId')
    .not('transcript', 'is', null)
    .order('sessionDate', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
} 