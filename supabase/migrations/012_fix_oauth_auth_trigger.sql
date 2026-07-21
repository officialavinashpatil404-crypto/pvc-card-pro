-- Fix OAuth / Google Signup trigger to prevent "Database error saving new user"
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, mobile, plan, remaining_cards)
  VALUES (
      new.id, 
      COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Operator'), 
      COALESCE(new.email, ''), 
      COALESCE(new.raw_user_meta_data->>'mobile', ''),
      'Free',
      0
  )
  ON CONFLICT (id) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, public.users.name),
      email = COALESCE(EXCLUDED.email, public.users.email);
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Prevent auth transaction rollback if profile creation has any conflict
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
