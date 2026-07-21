import Link from "next/link";
import { signout } from "../(auth)/actions";
import { createClient } from "@/utils/supabase/server";
import { SidebarNav, MobileNav } from "./SidebarNav";
import { isAdminUser } from "@/utils/auth";

import { getEffectivePlan } from "@/utils/planHelper";

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
            <Link
              href="/dashboard/subscription"
              className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-800 px-3.5 py-1.5 rounded-full transition-all active:scale-95 shadow-sm"
            >
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">account_balance_wallet</span>
              <span className="text-xs font-black">{userData.remaining_cards} Credits</span>
              <span className="hidden sm:inline text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full">Topup</span>
            </Link>

            {/* Profile & Signout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300/80 flex items-center justify-center text-slate-700 font-bold text-sm shadow-inner">
                {user?.user_metadata?.name?.[0]?.toUpperCase() || 'O'}
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-bold text-slate-900 max-w-[120px] truncate">{user?.user_metadata?.name || 'Operator'}</span>
                <span className="text-[10px] font-bold text-primary">{userData.plan}</span>
              </div>
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
          <div className="p-3.5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[80px]">verified_user</span>
            </div>
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-400 font-bold shadow-inner">
                <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user?.user_metadata?.name || 'Operator'}</p>
                <p className="text-[11px] text-emerald-400 font-bold">{userData.plan}</p>
                <p className="text-[10px] text-slate-300 font-medium mt-0.5">Validity: <span className="text-emerald-400 font-bold">Lifetime</span></p>
              </div>
            </div>
          </div>

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
  );
}
