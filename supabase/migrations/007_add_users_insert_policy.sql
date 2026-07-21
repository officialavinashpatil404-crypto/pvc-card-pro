-- Migration: 007_add_users_insert_policy
-- Enable users to insert their own profile in public.users to heal missing rows

CREATE POLICY "Users can insert own profile" 
    ON public.users FOR INSERT 
    WITH CHECK (auth.uid() = id);
