import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const selectedGrade = searchParams.get('grade_volume');
    const selectedModule = searchParams.get('module_name');

    let query = supabase
      .from('scripts')
      .select('*, dialogues(*)');

    if (selectedGrade && selectedGrade !== 'all') {
      query = query.eq('grade_volume', selectedGrade);
    }

    if (selectedModule && selectedModule !== 'all') {
      query = query.eq('module_name', selectedModule);
    }

    const { data: scripts, error: scriptErr } = await query
      .order('created_at', { ascending: false });

    if (scriptErr) {
      console.error('Failed to fetch scripts:', scriptErr);
      return NextResponse.json({ error: 'Database error: ' + scriptErr.message }, { status: 500 });
    }

    // Filter to only scripts that actually have dialogues
    const validScripts = (scripts || [])
      .filter((s: any) => Array.isArray(s.dialogues) && s.dialogues.length > 0)
      .map((s: any) => {
        s.dialogues.sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
        return s;
      });

    return NextResponse.json({
      success: true,
      scripts: validScripts
    });
  } catch (error: any) {
    console.error('API /practice/scripts error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
