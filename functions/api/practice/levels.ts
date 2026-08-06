
import { supabase } from '@/lib/supabase';

export async function onRequestGet({ request }: any) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'grades';
    const grade = searchParams.get('grade');

    if (type === 'grades') {
      // Query distinct grade_volume values
      const { data, error } = await supabase
        .from('scripts')
        .select('grade_volume');

      if (error) {
        console.error('Failed to fetch grades:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }

      const gradeCounts: Record<string, number> = {};
      (data || []).forEach((item: any) => {
        const name = item.grade_volume || '通用年级';
        gradeCounts[name] = (gradeCounts[name] || 0) + 1;
      });

      const grades = Object.keys(gradeCounts).map(name => ({
        name,
        count: gradeCounts[name]
      }));

      return Response.json({ success: true, grades });
    } 
    
    if (type === 'modules') {
      // Query distinct module_name under specified grade
      let query = supabase
        .from('scripts')
        .select('module_name');

      if (grade && grade !== 'all') {
        query = query.eq('grade_volume', grade);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch modules for grade:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }

      const moduleCounts: Record<string, number> = {};
      (data || []).forEach((item: any) => {
        const name = item.module_name || '通用模块';
        moduleCounts[name] = (moduleCounts[name] || 0) + 1;
      });

      const modules = Object.keys(moduleCounts).map(name => ({
        name,
        count: moduleCounts[name]
      }));

      return Response.json({ success: true, modules });
    }

    return Response.json({ error: 'Invalid type parameter' }, { status: 400 });

  } catch (error: any) {
    console.error('API /practice/levels error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}



