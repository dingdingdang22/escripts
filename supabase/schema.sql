-- FLTRP Speaking System - Supabase Schema

-- 1. Grades (年级)
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g., '三年级上册'
    level INTEGER NOT NULL, -- e.g., 31 (Grade 3, semester 1)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Units (单元)
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id UUID REFERENCES public.grades(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL, -- e.g., 'Module 1'
    unit_theme TEXT NOT NULL, -- e.g., 'Greetings'
    core_vocabulary TEXT[] NOT NULL, -- e.g., ['hello', 'how', 'are', 'you']
    target_sentences TEXT[] NOT NULL, -- e.g., ['How are you?']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Scripts (对话剧本元数据)
CREATE TABLE IF NOT EXISTS public.scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    custom_character_setting TEXT, -- e.g., 'Daming and Sam talking in the park'
    difficulty_level TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Dialogues (逐句台词)
CREATE TABLE IF NOT EXISTS public.dialogues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL, -- 排序
    character_role TEXT NOT NULL, -- 'system' or 'user'
    character_name TEXT NOT NULL, -- e.g., 'Daming'
    text_content TEXT NOT NULL, -- 台词文本
    audio_r2_url TEXT, -- TTS 对应的 R2 音频链接
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. User Practices (练习记录)
CREATE TABLE IF NOT EXISTS public.practice_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- 暂用简单字符串，实际可对接 Auth
    script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
    accuracy_score FLOAT NOT NULL,
    fluency_score FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) - For MVP we can allow all access, but better to lock down
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon read access for MVP
CREATE POLICY "Allow public read access on grades" ON public.grades FOR SELECT USING (true);
CREATE POLICY "Allow public read access on units" ON public.units FOR SELECT USING (true);
CREATE POLICY "Allow public read access on scripts" ON public.scripts FOR SELECT USING (true);
CREATE POLICY "Allow public read access on dialogues" ON public.dialogues FOR SELECT USING (true);
CREATE POLICY "Allow public read access on practice_logs" ON public.practice_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on practice_logs" ON public.practice_logs FOR INSERT WITH CHECK (true);
