import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch distinct module_name from scripts table
    const { data, error } = await supabase
      .from('scripts')
      .select('module_name');

    if (error) {
      console.error('Failed to fetch modules:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Deduplicate modules and count items
    const moduleCounts: Record<string, number> = {};
    (data || []).forEach((item: any) => {
      const name = item.module_name || '未分类模块';
      moduleCounts[name] = (moduleCounts[name] || 0) + 1;
    });

    const modules = Object.keys(moduleCounts).map(name => ({
      name,
      count: moduleCounts[name]
    }));

    return NextResponse.json({ success: true, modules });

  } catch (error: any) {
    console.error('API /practice/modules error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
