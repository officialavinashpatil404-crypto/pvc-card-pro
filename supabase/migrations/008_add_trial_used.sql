-- Add trial_used column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE;
