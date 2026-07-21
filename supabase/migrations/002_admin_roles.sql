-- Add role column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER';

-- Create an RPC to safely check admin role (Optional)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
  RETURN user_role = 'ADMIN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to allow admins to read/write all data
CREATE POLICY "Admins can view all users" 
    ON public.users FOR SELECT 
    USING (public.is_admin());

CREATE POLICY "Admins can update all users" 
    ON public.users FOR UPDATE 
    USING (public.is_admin());

CREATE POLICY "Admins can view all payment history" 
    ON public.payment_history FOR SELECT 
    USING (public.is_admin());

CREATE POLICY "Admins can view all card history" 
    ON public.card_history FOR SELECT 
    USING (public.is_admin());

CREATE POLICY "Admins can view all support tickets" 
    ON public.support_tickets FOR SELECT 
    USING (public.is_admin());

CREATE POLICY "Admins can update support tickets" 
    ON public.support_tickets FOR UPDATE 
    USING (public.is_admin());
