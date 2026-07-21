-- Add INSERT policy for card_history table to allow users to insert their own records
CREATE POLICY "Users can insert own card history" 
    ON public.card_history FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
