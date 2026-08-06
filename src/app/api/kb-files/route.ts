import { NextResponse } from 'next/server';
import { listKnowledgeBaseFiles, PUBLIC_R2_URL } from '@/lib/r2';
import { parseCurriculumFilename } from '@/lib/curriculumParser';

export async function GET() {
  try {
    const files = await listKnowledgeBaseFiles('kb/English/');
    
    // Group files for frontend dropdowns
    const parsedFiles = files
      .filter(f => f.Key?.endsWith('.md'))
      .map(file => {
      const key = file.Key || '';
      const filename = key.split('/').pop() || '';
      const url = `${PUBLIC_R2_URL}/${key}`;
      
      const parsed = parseCurriculumFilename(filename);

      return {
        key,
        filename,
        url,
        gradeVolumeCode: parsed.gradeVolumeCode,
        gradeVolumeName: parsed.gradeVolumeName,
        moduleName: parsed.moduleName,
        kpName: parsed.kpName,
        displayName: parsed.displayName,
        label: `${parsed.displayName} (${filename})`,
      };
    });

    // Grouping strategy: 
    // Return flat list of parsed files, frontend can group them
    
    return NextResponse.json({ success: true, files: parsedFiles });
  } catch (error: any) {
    console.error('Error listing R2 files:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
