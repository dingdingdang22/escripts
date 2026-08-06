import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Note: ORDER BY random() can be slow on large tables, but it's perfect for our MVP.
    // In the future, we can optimize this (e.g., fetching a random ID within range).
    
    // 1. Fetch 1 random script
    const { data: randomScripts, error: scriptErr } = await supabase
      .from('scripts')
      .select('*')
      // Supabase PostgREST doesn't expose random() natively in standard select, 
      // but we can fetch a pool of recent ones and pick randomly in memory,
      // OR use a custom Postgres RPC function. 
      // For simplicity in Next.js backend, let's fetch up to 100 recent ones and pick one randomly in JS.
      .order('created_at', { ascending: false })
      .limit(100);

    if (scriptErr) {
      console.error('Failed to fetch scripts:', scriptErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!randomScripts || randomScripts.length === 0) {
      return NextResponse.json({ error: 'No scripts found. Please generate some scripts in the admin panel first.' }, { status: 404 });
    }

    // Pick one randomly
    const randomScript = randomScripts[Math.floor(Math.random() * randomScripts.length)];

    // 2. Fetch all dialogues for this script, ordered by sequence
    const { data: dialogues, error: dialoguesErr } = await supabase
      .from('dialogues')
      .select('*')
      .eq('script_id', randomScript.id)
      .order('sequence', { ascending: true });

    if (dialoguesErr) {
       console.error('Failed to fetch dialogues:', dialoguesErr);
       return NextResponse.json({ error: 'Failed to fetch dialogues' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      script: {
        ...randomScript,
        dialogues: dialogues || []
      }
    });

  } catch (error: any) {
    console.error('API /practice/random error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
