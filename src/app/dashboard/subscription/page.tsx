import { createClient } from "@/utils/supabase/server";
import SubscriptionClient from "./SubscriptionClient";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  const { data: userData, error } = await supabase
    .from('users')
    .select('plan, remaining_cards, plan_expiry')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('[SubscriptionPage] Error fetching user data:', error.message);
  }

  return (
    <SubscriptionClient userData={userData || { plan: 'Free', remaining_cards: 0 }} />
  );
}
