-- Migration: 006_add_gemini_api_key
-- Add gemini_api_key column to public.users table

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
