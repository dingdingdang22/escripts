import { NextResponse } from 'next/server';
import { listKnowledgeBaseFiles, PUBLIC_R2_URL } from '@/lib/r2';

export async function GET() {
  try {
    const files = await listKnowledgeBaseFiles('kb/English/');
    
    // Group files for frontend dropdowns
    // Filename example: mt_jh_eng_wy_9a01_001.md
    
    const parsedFiles = files.map(file => {
      const key = file.Key || '';
      const filename = key.split('/').pop() || '';
      const url = `${PUBLIC_R2_URL}/${key}`;
      
      // Attempt to parse metadata from filename
      let grade = 'Unknown';
      let theme = 'Unknown';
      let kp = 'Unknown';
      let label = filename;

      // Extract parts like 9a01_001
      const match = filename.match(/_([1-9][a-z])(\d{2})_(\d+)\.md/i);
      if (match) {
        const gradeStr = match[1]; // e.g. 9a
        const themeStr = match[2]; // e.g. 01
        const kpStr = match[3];    // e.g. 001
        
        grade = gradeStr; // Can map to "9年级上" on frontend
        theme = `Theme ${parseInt(themeStr, 10)}`;
        kp = `Knowledge Point ${parseInt(kpStr, 10)}`;
        label = `Grade ${gradeStr.toUpperCase()} - ${theme} - ${kp}`;
      }

      return {
        key,
        filename,
        url,
        grade,
        theme,
        kp,
        label,
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
