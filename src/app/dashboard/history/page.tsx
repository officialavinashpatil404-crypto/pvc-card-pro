import { createClient } from "@/utils/supabase/server";
import HistoryClient from "./HistoryClient";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch history for this user matching the schema's exact columns: document_type, created_at
  const { data: historyData, error } = await supabase
    .from('card_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching history:", error);
  }

  // Fetch user profile info for plan and card balance
  const { data: userData } = await supabase
    .from('users')
    .select('plan, remaining_cards')
    .eq('id', user.id)
    .single();

  return (
    <HistoryClient 
      initialHistory={historyData || []} 
      userProfile={userData} 
    />
  );
}
