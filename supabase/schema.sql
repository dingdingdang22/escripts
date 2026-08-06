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
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
    accuracy_score FLOAT NOT NULL,
    fluency_score FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. User Roles (角色权限)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Function to create a user profile/role automatically when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS (Row Level Security)
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (clean up before recreating)
DROP POLICY IF EXISTS "Allow public read access on grades" ON public.grades;
DROP POLICY IF EXISTS "Allow public read access on units" ON public.units;
DROP POLICY IF EXISTS "Allow public read access on scripts" ON public.scripts;
DROP POLICY IF EXISTS "Allow public read access on dialogues" ON public.dialogues;
DROP POLICY IF EXISTS "Allow public read access on practice_logs" ON public.practice_logs;
DROP POLICY IF EXISTS "Allow public insert on practice_logs" ON public.practice_logs;

-- Grades Policies
CREATE POLICY "Allow authenticated read on grades" ON public.grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin all on grades" ON public.grades FOR ALL TO authenticated USING (public.is_admin());

-- Units Policies
CREATE POLICY "Allow authenticated read on units" ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin all on units" ON public.units FOR ALL TO authenticated USING (public.is_admin());

-- Scripts Policies
CREATE POLICY "Allow authenticated read on scripts" ON public.scripts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin all on scripts" ON public.scripts FOR ALL TO authenticated USING (public.is_admin());

-- Dialogues Policies
CREATE POLICY "Allow authenticated read on dialogues" ON public.dialogues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin all on dialogues" ON public.dialogues FOR ALL TO authenticated USING (public.is_admin());

-- Practice Logs Policies
CREATE POLICY "Users can insert their own practice logs" ON public.practice_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read their own practice logs" ON public.practice_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin can read all practice logs" ON public.practice_logs FOR SELECT TO authenticated USING (public.is_admin());

-- User Roles Policies
CREATE POLICY "Users can read their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin can do all on user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin());
