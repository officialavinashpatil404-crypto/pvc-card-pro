-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
-- We extend the default auth.users table by creating a public.users profile table.
CREATE TABLE public.users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    plan TEXT DEFAULT 'Free',
    remaining_cards INTEGER DEFAULT 0,
    plan_expiry TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE RLS on Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);

-- PAYMENT HISTORY TABLE
CREATE TABLE public.payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    plan TEXT NOT NULL,
    status TEXT NOT NULL, -- 'SUCCESS', 'PENDING', 'FAILED'
    transaction_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE RLS on Payment History
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment history" 
    ON public.payment_history FOR SELECT 
    USING (auth.uid() = user_id);

-- CARD HISTORY TABLE
CREATE TABLE public.card_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- 'Aadhaar', 'PAN', etc.
    status TEXT NOT NULL, -- 'SUCCESS', 'FAILED'
    download_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE RLS on Card History
ALTER TABLE public.card_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own card history" 
    ON public.card_history FOR SELECT 
    USING (auth.uid() = user_id);

-- SUPPORT TICKETS TABLE
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN', -- 'OPEN', 'IN_PROGRESS', 'CLOSED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE RLS on Support Tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" 
    ON public.support_tickets FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets" 
    ON public.support_tickets FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, mobile)
  VALUES (
      new.id, 
      new.raw_user_meta_data->>'name', 
      new.email, 
      new.raw_user_meta_data->>'mobile'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
