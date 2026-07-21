-- Update the trigger function to handle missing mobile number and alternate name fields (like full_name from Google)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, mobile)
  VALUES (
      new.id, 
      COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'User'), 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'mobile', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
