import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { EdgeTTS } from 'node-edge-tts';
import { supabase } from '@/lib/supabase';
import { uploadAudioToR2 } from '@/lib/r2';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY is not set in environment variables');
}
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

import { parseCurriculumFilename } from '@/lib/curriculumParser';

export async function POST(req: Request) {
  try {
    const { unitId, moduleName, kbUrls, customSetting } = await req.json();

    if (!kbUrls || kbUrls.length === 0) {
      return NextResponse.json({ error: 'Missing kbUrls' }, { status: 400 });
    }

    // Infer Grade & Volume from the first selected file
    const firstFilename = (kbUrls[0] || '').split('/').pop() || '';
    const parsedCurriculum = parseCurriculumFilename(firstFilename);
    const gradeVolume = parsedCurriculum.gradeVolumeName;

    // 1. Fetch Knowledge Base Markdown from ALL selected URLs
    let kbContent = '';
    for (const url of kbUrls) {
      const kbRes = await fetch(url);
      if (kbRes.ok) {
        kbContent += `\n\n--- Source: ${url.split('/').pop()} ---\n` + await kbRes.text();
      } else {
        console.warn(`Failed to fetch kb content from ${url}`);
      }
    }

    // 2. Generate Scripts using Gemini (Student-to-Student Dialogue)
    const prompt = `
      You are an expert English teacher creating speaking practice dialogues for students learning the FLTRP (外研版) curriculum.
      Grade & Volume: ${gradeVolume}
      Custom Setting: ${customSetting}
      
      Below is the curriculum knowledge point content in Markdown format:
      
      --- KNOWLEDGE BASE ---
      ${kbContent}
      ----------------------
      
      Generate exactly 3 unique, independent dialogue scripts between TWO STUDENTS.
      Constraints:
      - 100% coverage of the core vocabulary and target sentences extracted from the provided knowledge base content.
      - Difficulty should be appropriate for ${gradeVolume}.
      - The dialogue MUST be a peer conversation between two student roles: "role_a" and "role_b".
      - Provide a concise, attractive AI theme name WITHOUT any "Module X:" or "Unit X:" prefix (e.g. "Public Holidays" or "Wonders of the World").
      - Dynamically determine a descriptive 'title' for this specific script based on the key points.
      
      Return ONLY a JSON array of 3 script objects. Do not include markdown formatting or backticks.
      Format:
      [
        {
          "title": "Script 1: Exploring Stonehenge",
          "ai_module_theme": "Public Holidays",
          "difficulty_level": "easy",
          "role_a_name": "Li Hua",
          "role_b_name": "Peter",
          "dialogues": [
            { "sequence": 1, "role": "role_a", "text": "Hello Peter! Have you ever seen Stonehenge?" },
            { "sequence": 2, "role": "role_b", "text": "Yes, Li Hua! It is one of the greatest wonders in the UK." }
          ]
        }
      ]
    `;

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const response = await ai.models.generateContent({
      model: modelName, 
      contents: prompt,
    });
    
    let resultText = response.text || "[]";
    resultText = resultText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    
    const scriptsData = JSON.parse(resultText);
    const results = [];

    // Pre-initialize TTS synthesis engines for both roles
    const ttsRoleA = new EdgeTTS({ voice: 'en-US-AriaNeural' }); // Female Voice
    const ttsRoleB = new EdgeTTS({ voice: 'en-US-GuyNeural' });  // Male Voice

    // 3. Process each script
    for (const scriptData of scriptsData) {
      const finalModuleName = scriptData.ai_module_theme || moduleName || parsedCurriculum.moduleName;

      // Save Script Metadata to Supabase
      const { data: scriptRecord, error: scriptErr } = await supabase
        .from('scripts')
        .insert({
          unit_id: unitId,
          grade_volume: gradeVolume,
          module_name: finalModuleName,
          title: scriptData.title,
          role_a_name: scriptData.role_a_name || 'Student A',
          role_b_name: scriptData.role_b_name || 'Student B',
          custom_character_setting: customSetting,
          difficulty_level: scriptData.difficulty_level,
          teacher_gender: 'mixed'
        })
        .select()
        .single();

      if (scriptErr) throw scriptErr;

      // Process each dialogue line and generate TTS for BOTH roles
      for (const line of scriptData.dialogues) {
        let r2Url = null;

        const activeTts = line.role === 'role_b' ? ttsRoleB : ttsRoleA;
        const tempFilePath = path.join(os.tmpdir(), `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`);
        
        try {
          await activeTts.ttsPromise(line.text, tempFilePath);
          const audioBuffer = fs.readFileSync(tempFilePath);
          r2Url = await uploadAudioToR2(audioBuffer);
          fs.unlinkSync(tempFilePath);
        } catch (ttsError) {
          console.error(`TTS generation failed for line "${line.text}":`, ttsError);
        }

        // Save Dialogue to Supabase
        const { error: insertErr } = await supabase
          .from('dialogues')
          .insert({
            script_id: scriptRecord.id,
            sequence: line.sequence || 1,
            role: line.role,
            text: line.text,
            audio_url: r2Url
          });
          
        if (insertErr) {
          console.error('Failed to insert dialogue:', insertErr);
          throw insertErr;
        }
      }
      
      results.push(scriptRecord);
    }

    return NextResponse.json({ success: true, scripts: results });
  } catch (error: any) {
    console.error('Error generating scripts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
