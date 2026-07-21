-- Create shared translation cache table
CREATE TABLE IF NOT EXISTS public.translation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    english_text TEXT NOT NULL,
    local_text TEXT NOT NULL,
    language TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_translation_key UNIQUE (english_text, language)
);

-- Enable RLS
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

-- Policies for translation_cache
CREATE POLICY "Anyone can view translations" 
    ON public.translation_cache FOR SELECT 
    USING (true);

CREATE POLICY "Enable insert for authenticated users"
    ON public.translation_cache FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can manage translations" 
    ON public.translation_cache FOR ALL 
    USING (public.is_admin());
