import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const selectedModule = searchParams.get('module_name');

    // Fetch scripts with their dialogues embedded
    let query = supabase
      .from('scripts')
      .select('*, dialogues(*)');

    if (selectedModule && selectedModule !== 'all') {
      query = query.eq('module_name', selectedModule);
    }

    const { data: scripts, error: scriptErr } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (scriptErr) {
      console.error('Failed to fetch scripts:', scriptErr);
      return NextResponse.json({ error: 'Database error: ' + scriptErr.message }, { status: 500 });
    }

    // Filter to only scripts that actually have dialogues
    const validScripts = (scripts || []).filter((s: any) => Array.isArray(s.dialogues) && s.dialogues.length > 0);

    if (validScripts.length === 0) {
      return NextResponse.json({ 
        error: '数据库中未找到包含台词的有效剧本。请前往管理后台重新生成一个新剧本！' 
      }, { status: 404 });
    }

    // Pick one valid script randomly
    const randomScript = validScripts[Math.floor(Math.random() * validScripts.length)];

    // Sort dialogues by sequence
    randomScript.dialogues.sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));

    return NextResponse.json({
      success: true,
      script: randomScript
    });

  } catch (error: any) {
    console.error('API /practice/random error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
