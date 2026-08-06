export interface ParsedCurriculum {
  gradeVolumeCode: string; // e.g. "9a"
  gradeVolumeName: string; // e.g. "九年级上册"
  moduleNumber: number;    // e.g. 1
  moduleName: string;      // e.g. "Module 1"
  kpNumber: number;        // e.g. 1
  kpName: string;          // e.g. "知识点 1"
  displayName: string;     // e.g. "九年级上册 · Module 1 · 知识点 1"
}

const GRADE_MAP: Record<string, string> = {
  '7a': '七年级上册',
  '7b': '七年级下册',
  '8a': '八年级上册',
  '8b': '八年级下册',
  '9a': '九年级上册',
  '9b': '九年级下册',
};

/**
 * Parse Markdown filename like `mt_jh_eng_wy_9a01_001.md` into structured curriculum metadata.
 */
export function parseCurriculumFilename(filename: string): ParsedCurriculum {
  // Pattern matches _(7a|7b|8a|8b|9a|9b)(01-99)_(001-999)
  const regex = /_([7-9][ab])(\d{2})_(\d+)\.md/i;
  const match = filename.match(regex);

  if (!match) {
    // Fallback if pattern does not match
    return {
      gradeVolumeCode: 'general',
      gradeVolumeName: '通用年级',
      moduleNumber: 1,
      moduleName: 'Module 1',
      kpNumber: 1,
      kpName: filename,
      displayName: filename,
    };
  }

  const code = match[1].toLowerCase();
  const modNum = parseInt(match[2], 10);
  const kpNum = parseInt(match[3], 10);

  const gradeVolumeName = GRADE_MAP[code] || `${code.toUpperCase()} 年级`;
  const moduleName = `Module ${modNum}`;
  const kpName = `知识点 ${kpNum}`;

  return {
    gradeVolumeCode: code,
    gradeVolumeName,
    moduleNumber: modNum,
    moduleName,
    kpNumber: kpNum,
    kpName,
    displayName: `${gradeVolumeName} · ${moduleName} · ${kpName}`,
  };
}
