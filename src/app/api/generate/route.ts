import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { EdgeTTS } from 'node-edge-tts';
import { supabase } from '@/lib/supabase';
import { uploadAudioToR2 } from '@/lib/r2';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { unitId, moduleName, unitTheme, coreVocabulary, targetSentences, customSetting } = await req.json();

    if (!unitId || !unitTheme) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Generate Scripts using Gemini
    const prompt = `
      You are an expert English teacher creating speaking practice dialogues for students learning the FLTRP (外研版) curriculum.
      Module: ${moduleName}
      Theme: ${unitTheme}
      Core Vocabulary: ${coreVocabulary.join(', ')}
      Target Sentences: ${targetSentences.join(', ')}
      Custom Character Setting: ${customSetting}
      
      Generate exactly 3 unique, independent dialogue scripts. 
      Constraints:
      - 100% coverage of core vocabulary and target sentences across the scripts.
      - Difficulty should be appropriate for the grade level.
      - One character MUST be named 'System' (this is the AI/teacher), and the other 'User' (this is the student).
      
      Return ONLY a JSON array of 3 script objects. Do not include markdown formatting or backticks.
      Format:
      [
        {
          "title": "Script Title 1",
          "difficulty_level": "easy",
          "dialogues": [
            { "sequence": 1, "role": "system", "text": "Hello! How are you today?" },
            { "sequence": 2, "role": "user", "text": "I am fine, thank you." }
          ]
        }
      ]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro', // Using gemini-2.5-pro for high quality structure
      contents: prompt,
    });
    
    let resultText = response.text || "[]";
    // Clean up potential markdown formatting
    resultText = resultText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    
    const scriptsData = JSON.parse(resultText);
    const tts = new EdgeTTS({
        voice: 'en-US-AriaNeural'
    });

    const results = [];

    // 2. Process each script
    for (const scriptData of scriptsData) {
      // Save Script Metadata to Supabase
      const { data: scriptRecord, error: scriptErr } = await supabase
        .from('scripts')
        .insert({
          unit_id: unitId,
          title: scriptData.title,
          custom_character_setting: customSetting,
          difficulty_level: scriptData.difficulty_level
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
        await supabase
          .from('dialogues')
          .insert({
            script_id: scriptRecord.id,
            sequence_order: line.sequence,
            character_role: line.role,
            character_name: line.role === 'system' ? 'System' : 'User',
            text_content: line.text,
            audio_r2_url: r2Url
          });
      }
      
      results.push(scriptRecord);
    }

    return NextResponse.json({ success: true, scripts: results });
  } catch (error: any) {
    console.error('Error generating scripts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
