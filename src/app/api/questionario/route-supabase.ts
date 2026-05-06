import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    // Verifica l'autenticazione dell'utente
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validazione dei dati richiesti
    const requiredFields = ['firstName', 'lastName', 'age', 'status', 'familyIncome', 'birthPlace', 'grownUpPlace'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Campo obbligatorio mancante: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validazione campi condizionali
    if ((body.status === 'studente' || body.status === 'studente_lavoratore') && !body.studyCity) {
      return NextResponse.json(
        { error: "Città di studio è obbligatoria per studenti" },
        { status: 400 }
      );
    }

    if (body.isOutOfTown && (!body.outOfTownSince || !body.visitFrequency)) {
      return NextResponse.json(
        { error: "Informazioni fuori sede incomplete" },
        { status: 400 }
      );
    }

    // Prepara i dati per l'inserimento
    const participantData = {
      userId: session.user.id,
      firstName: body.firstName,
      lastName: body.lastName,
      age: parseInt(body.age),
      status: body.status,
      studyCity: body.studyCity || null,
      familyIncome: body.familyIncome,
      birthPlace: body.birthPlace,
      grownUpPlace: body.grownUpPlace,
      isOutOfTown: Boolean(body.isOutOfTown),
      outOfTownSince: body.outOfTownSince || null,
      visitFrequency: body.visitFrequency || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Inserimento nel database
    const { data, error } = await supabase
      .from('participants')
      .insert([participantData])
      .select()
      .single();

    if (error) {
      console.error('Errore database:', error);
      return NextResponse.json(
        { error: "Errore nel salvare i dati" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      participant: data,
      message: "Partecipante registrato con successo"
    });

  } catch (error) {
    console.error('Errore API:', error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    // Verifica l'autenticazione dell'utente
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      );
    }

    // Recupera tutti i partecipanti dell'utente corrente
    const { data: participants, error } = await supabase
      .from('participants')
      .select('*')
      .eq('userId', session.user.id)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Errore database:', error);
      return NextResponse.json(
        { error: "Errore nel recuperare i dati" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      participants: participants || [],
      count: participants?.length || 0
    });

  } catch (error) {
    console.error('Errore API:', error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}