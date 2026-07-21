import Link from "next/link";
import { signout } from "../(auth)/actions";
import { createClient } from "@/utils/supabase/server";
import { SidebarNav, MobileNav } from "./SidebarNav";
import { isAdminUser } from "@/utils/auth";

import { getEffectivePlan } from "@/utils/planHelper";
import { UserProvider } from "./UserContext";
import { LiveCreditBadge, LiveProfileBadge, LiveSidebarProfile } from "./LiveBadges";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userData = { plan: 'Free', remaining_cards: 0, plan_expiry: null as string | null, role: 'USER' };
  if (user) {
    let { data } = await supabase
      .from('users')
      .select('plan, remaining_cards, plan_expiry, role')
      .eq('id', user.id)
      .single();
    if (data) {
      const rem = data.remaining_cards || 0;
      userData = {
        plan: getEffectivePlan(data.plan, rem),
        remaining_cards: rem,
        plan_expiry: data.plan_expiry,
        role: data.role || 'USER'
      };
    } else {
      // Auto-heal missing profile row in public.users
      const newProfile = {
        id: user.id,
        name: user.user_metadata?.name || user.user_metadata?.full_name || 'Operator',
        email: user.email || '',
        mobile: user.user_metadata?.mobile || '',
        plan: 'Free',
        remaining_cards: 0,
        plan_expiry: null
      };
      const { error: insertError } = await supabase
        .from('users')
        .insert(newProfile);
      if (!insertError) {
        userData = { plan: 'Free', remaining_cards: 0, plan_expiry: null, role: 'USER' };
      } else {
        console.error('[DashboardLayout] Failed to heal missing user profile:', insertError.message);
      }
    }
  }

  const isAdmin = await isAdminUser();

  return (
    <UserProvider userId={user?.id || ''} initialData={userData}>
      <div className="bg-slate-50/70 text-slate-900 font-body-md min-h-screen flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Top Glass Header */}
      <header className="bg-white/95 backdrop-blur-xl docked full-width top-0 sticky z-50 border-b border-slate-200/80 shadow-[0_2px_15px_rgba(0,0,0,0.02)] transition-all duration-300">
        <div className="flex justify-between items-center w-full px-4 md:px-6 py-3 max-w-[1440px] mx-auto">
          {/* Logo & Brand */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
              <span className="material-symbols-outlined text-[22px]">badge</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-slate-900 leading-tight">
                Rapid <span className="text-primary">PVC</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Card Pro Hub</span>
            </div>
          </Link>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3">
            {/* High-Class AI System Status Pill */}
            <div className="hidden sm:flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200/80 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
              <span className="material-symbols-outlined text-[16px] text-purple-600 animate-spin">auto_awesome</span>
              <span>AI Neural Core Active</span>
            </div>

            {/* Live Credits Badge */}
            <LiveCreditBadge />

            {/* Profile & Signout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <LiveProfileBadge initialName={user?.user_metadata?.name || 'Operator'} />
              <form action={signout} className="ml-1">
                <button
                  type="submit"
                  title="Logout"
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-95 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="flex w-full max-w-[1440px] mx-auto flex-grow">
        {/* Modern Sidebar Navigation */}
        <aside className="bg-white/90 backdrop-blur-xl text-slate-900 h-screen w-64 fixed left-0 top-0 z-40 border-r border-slate-200/80 shadow-[2px_0_15px_rgba(0,0,0,0.02)] hidden lg:flex flex-col gap-4 p-4 pt-20">
          {/* User Account Info Card */}
          <LiveSidebarProfile initialName={user?.user_metadata?.name || 'Operator'} />

          <SidebarNav role={isAdmin ? 'ADMIN' : 'USER'} />

          <Link
            href="/dashboard/generate"
            className="mt-auto bg-gradient-to-r from-primary via-blue-600 to-indigo-600 hover:brightness-110 text-white px-4 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/20 active:scale-[0.98] transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            New PVC Card
          </Link>
        </aside>

        {/* Main Dashboard Content Viewport */}
        <main className="flex-grow lg:ml-64 p-4 md:p-6 pb-24 lg:pb-8 min-h-[calc(100vh-64px)] relative">
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation Glass Bar */}
      <MobileNav />
    </div>
    </UserProvider>
  );
}
