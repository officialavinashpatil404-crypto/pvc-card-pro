-- Migration: 005_gujarati_repairs
-- Create public.gujarati_repairs table to store local indicator/font corruptions and repairs

CREATE TABLE IF NOT EXISTS public.gujarati_repairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    language TEXT NOT NULL DEFAULT 'gujarati',
    original_word TEXT NOT NULL,
    corrected_word TEXT NOT NULL,
    frequency INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_lang_original_word UNIQUE (language, original_word)
);

-- Enable Row-Level Security
ALTER TABLE public.gujarati_repairs ENABLE ROW LEVEL SECURITY;

-- Enable SELECT access for everyone
CREATE POLICY "Allow public read access to gujarati_repairs"
    ON public.gujarati_repairs FOR SELECT
    USING (true);

-- Enable INSERT/UPDATE access for everyone
CREATE POLICY "Allow public insert/update access to gujarati_repairs"
    ON public.gujarati_repairs FOR ALL
    USING (true)
    WITH CHECK (true);
