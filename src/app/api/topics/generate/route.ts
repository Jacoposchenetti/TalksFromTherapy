import { NextRequest, NextResponse } from 'next/server';
import { generateTopicsWithGPT } from '../../../../lib/topic-modeling-gpt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { transcriptIds, maxTopics = 5 } = await request.json();
    
    // Verifica che transcriptIds sia fornito
    if (!transcriptIds || !Array.isArray(transcriptIds)) {
      return NextResponse.json(
        { message: 'transcriptIds è richiesto e deve essere un array' },
        { status: 400 }
      );
    }
    
    // Recupera i transcript selezionati
    const transcripts = await prisma.session.findMany({
      where: {
        id: { in: transcriptIds }
      },
      select: {
        id: true,
        transcript: true,
        sessionDate: true,        patient: {
          select: {
            initials: true
          }
        }
      }
    });

    if (transcripts.length === 0) {
      return NextResponse.json(
        { message: 'Nessun transcript trovato' },
        { status: 400 }
      );
    }

    // Filtra solo i transcript che hanno contenuto
    const validTranscripts = transcripts
      .filter(t => t.transcript && t.transcript.trim().length > 0)
      .map(t => ({
        id: t.id,
        content: t.transcript!
      }));

    if (validTranscripts.length === 0) {
      return NextResponse.json(
        { message: 'Nessun transcript valido trovato' },
        { status: 400 }
      );
    }

    // Genera i topic con GPT-3.5
    const topics = await generateTopicsWithGPT(validTranscripts, maxTopics);
    
    return NextResponse.json({
      success: true,
      topics,
      transcriptCount: validTranscripts.length
    });

  } catch (error) {
    console.error('Errore nella generazione topic:', error);
    return NextResponse.json(
      { 
        message: 'Errore interno del server',
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}
