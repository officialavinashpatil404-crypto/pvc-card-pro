-- Create API token usage tracking table
CREATE TABLE IF NOT EXISTS public.gemini_token_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    document_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.gemini_token_usage ENABLE ROW LEVEL SECURITY;

-- Policies for token usage
CREATE POLICY "Users can view own token usage" 
    ON public.gemini_token_usage FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all token usage" 
    ON public.gemini_token_usage FOR SELECT 
    USING (public.is_admin());

CREATE POLICY "Enable insert for authenticated users"
    ON public.gemini_token_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Create banners table for admin messages/ads
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_url TEXT NOT NULL,
    link_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Policies for banners
CREATE POLICY "Anyone can view active banners"
    ON public.banners FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Admins can manage banners"
    ON public.banners FOR ALL
    USING (public.is_admin());
