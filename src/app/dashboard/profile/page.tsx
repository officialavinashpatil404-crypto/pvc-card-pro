import { createClient } from "@/utils/supabase/server";
import ProfileClient from "./ProfileClient";
import { redirect } from "next/navigation";
import { getEffectivePlan } from "@/utils/planHelper";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  const { data: userData } = await supabase
    .from('users')
    .select('name, email, mobile, plan, remaining_cards')
    .eq('id', user.id)
    .single();

  const profile = {
    name: userData?.name || user.user_metadata?.name || 'Operator',
    email: userData?.email || user.email || '',
    mobile: userData?.mobile || user.user_metadata?.mobile || '',
    plan: getEffectivePlan(userData?.plan, userData?.remaining_cards || 0)
  };

  return (
    <ProfileClient userProfile={profile} />
  );
}
