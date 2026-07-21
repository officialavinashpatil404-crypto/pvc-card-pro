import { createClient } from "@/utils/supabase/server";
import SupportClient from "./SupportClient";
import { redirect } from "next/navigation";

export default async function SupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  // Fetch support tickets matching the schema columns: id, user_id, subject, message, status, created_at
  const { data: ticketsData, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching support tickets:", error);
  }

  return (
    <SupportClient initialTickets={ticketsData || []} />
  );
}
