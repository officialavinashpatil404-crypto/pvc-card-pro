-- RPC to securely add cards and update plan for a user after a successful webhook
CREATE OR REPLACE FUNCTION public.add_user_cards(
  uid UUID,
  cards_to_add INT,
  new_plan TEXT,
  new_expiry TIMESTAMP WITH TIME ZONE
) 
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET 
    remaining_cards = COALESCE(remaining_cards, 0) + cards_to_add,
    plan = new_plan,
    plan_expiry = new_expiry
  WHERE id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
