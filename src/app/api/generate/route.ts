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

export async function POST(req: Request) {
  try {
    const { unitId, moduleName, kbUrls, customSetting } = await req.json();

    if (!kbUrls || kbUrls.length === 0) {
      return NextResponse.json({ error: 'Missing kbUrls' }, { status: 400 });
    }

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

    // 2. Generate Scripts using Gemini
    const prompt = `
      You are an expert English teacher creating speaking practice dialogues for students learning the FLTRP (外研版) curriculum.
      Module: ${moduleName}
      Custom Character Setting: ${customSetting}
      
      Below is the curriculum knowledge point content in Markdown format. 
      It contains the core vocabulary and target sentences for this specific lesson:
      
      --- KNOWLEDGE BASE ---
      ${kbContent}
      ----------------------
      
      Generate exactly 3 unique, independent dialogue scripts. 
      Constraints:
      - 100% coverage of the core vocabulary and target sentences extracted from the provided knowledge base content.
      - Difficulty should be appropriate for the grade level inferred from the knowledge base content.
      - One character MUST be named 'System' (this is the AI/teacher), and the other 'User' (this is the student).
      - Based on the custom setting, determine if the 'System' (teacher) character should be male or female, and set 'teacher_gender'.
      - Dynamically determine a descriptive 'title' based on the grade, theme, and key points covered. Do NOT use generic names like "Script Title 1".
      
      Return ONLY a JSON array of 3 script objects. Do not include markdown formatting or backticks.
      Format:
      [
        {
          "title": "Grade 9 - Unit 1 - Introduction",
          "difficulty_level": "easy",
          "teacher_gender": "female",
          "dialogues": [
            { "sequence": 1, "role": "system", "text": "Hello! How are you today?" },
            { "sequence": 2, "role": "user", "text": "I am fine, thank you." }
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
    // Clean up potential markdown formatting
    resultText = resultText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    
    const scriptsData = JSON.parse(resultText);
    const results = [];

    // 2. Process each script
    for (const scriptData of scriptsData) {
      // Set TTS Voice based on generated gender
      const voice = scriptData.teacher_gender === 'male' ? 'en-US-GuyNeural' : 'en-US-AriaNeural';
      const tts = new EdgeTTS({ voice });
      // Save Script Metadata to Supabase
      const { data: scriptRecord, error: scriptErr } = await supabase
        .from('scripts')
        .insert({
          unit_id: unitId,
          module_name: moduleName,
          title: scriptData.title,
          custom_character_setting: customSetting,
          difficulty_level: scriptData.difficulty_level,
          teacher_gender: scriptData.teacher_gender
        })
        .select()
        .single();

      if (scriptErr) throw scriptErr;

      // 3. Process each dialogue line and generate TTS for 'system' role
      for (const line of scriptData.dialogues) {
        let r2Url = null;

        if (line.role === 'system') {
          // Generate TTS
          const tempFilePath = path.join(os.tmpdir(), `tts-${Date.now()}.mp3`);
          await tts.ttsPromise(line.text, tempFilePath);
          
          // Read buffer and upload
          const audioBuffer = fs.readFileSync(tempFilePath);
          r2Url = await uploadAudioToR2(audioBuffer);
          
          // Clean up temp file
          fs.unlinkSync(tempFilePath);
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
