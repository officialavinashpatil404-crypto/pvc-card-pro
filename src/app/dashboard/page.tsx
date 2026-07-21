import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userData = { plan: 'Free', remaining_cards: 0, plan_expiry: null as string | null };
  let totalCards = 0;
  let todayCards = 0;

  if (user) {
    const { data } = await supabase
      .from('users')
      .select('plan, remaining_cards, plan_expiry')
      .eq('id', user.id)
      .single();
    if (data) {
      userData = data;
    }

    const { count } = await supabase
      .from('card_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (count !== null) {
      totalCards = count;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from('card_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfToday.toISOString());
    if (todayCount !== null) {
      todayCards = todayCount;
    }
  }

  // Get active banner details
  const { data: banner } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-6">
      {/* Sleek Hero Welcome Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              CSC Operator Portal Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-white">{user?.user_metadata?.name || 'Operator'}</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm font-medium" style={{ maxWidth: '600px' }}>
              Instant 1-Click PVC Card Generation Engine. Extract & print government-spec PVC cards for citizens with zero formatting errors.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/generate"
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all duration-200 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Print New PVC Card
            </Link>
          </div>
        </div>
      </section>

      {/* Modern KPI Stats Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cards */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[22px]">badge</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Cards Generated</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{totalCards}</p>
        </div>

        {/* Today's Cards */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[22px]">today</span>
            </div>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span> Live
            </span>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Today's Generations</p>
          <p className="text-3xl font-black text-indigo-600 mt-1">{todayCards}</p>
        </div>

        {/* Remaining Credits */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
            </div>
            <Link href="/dashboard/subscription" className="text-xs font-extrabold text-primary hover:underline">Recharge</Link>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Remaining Balance</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{userData.remaining_cards} <span className="text-xs text-slate-500 font-bold">Credits</span></p>
        </div>

        {/* Plan Validity */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[22px]">verified</span>
            </div>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">{userData.plan}</span>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Plan Validity</p>
          <p className="text-3xl font-black text-purple-600 mt-1">Lifetime</p>
        </div>
      </section>

      {/* Vibrant Quick Actions Service Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Select PVC Card Service</h2>
            <p className="text-xs text-slate-500 font-medium">Click on any service card below to extract & generate standard PVC cards.</p>
          </div>
          <Link href="/dashboard/services" className="text-xs text-primary font-bold hover:underline hidden sm:inline">
            View All Services &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Aadhaar PVC */}
          <Link 
            href="/dashboard/generate?type=aadhaar" 
            className="group relative bg-gradient-to-b from-white to-blue-50/50 backdrop-blur-md p-5 rounded-2xl border border-blue-100 hover:border-blue-500/50 shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all flex flex-col items-center text-center gap-3 pt-7"
          >
            <span className="absolute top-2 right-2 text-[12px] font-black bg-blue-600 text-white shadow-sm px-2.5 py-0.5 rounded-lg">
              ₹0.90 / card
            </span>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-[28px]">fingerprint</span>
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors block">Aadhaar PVC</span>
              <span className="text-[11px] text-slate-500 font-medium">1-Click Extract</span>
            </div>
          </Link>

          {/* PAN PVC */}
          <Link 
            href="/dashboard/generate?type=pan" 
            className="group relative bg-gradient-to-b from-white to-indigo-50/50 backdrop-blur-md p-5 rounded-2xl border border-indigo-100 hover:border-indigo-500/50 shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all flex flex-col items-center text-center gap-3 pt-7"
          >
            <span className="absolute top-2 right-2 text-[12px] font-black bg-indigo-600 text-white shadow-sm px-2.5 py-0.5 rounded-lg">
              ₹0.90 / card
            </span>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-[28px]">credit_card</span>
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors block">PAN Card PVC</span>
              <span className="text-[11px] text-slate-500 font-medium">NSDL / UTI Spec</span>
            </div>
          </Link>

          {/* Ayushman PVC */}
          <Link 
            href="/dashboard/generate?type=ayushman" 
            className="group relative bg-gradient-to-b from-white to-emerald-50/50 backdrop-blur-md p-5 rounded-2xl border border-emerald-100 hover:border-emerald-500/50 shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all flex flex-col items-center text-center gap-3 pt-7"
          >
            <span className="absolute top-2 right-2 text-[12px] font-black bg-emerald-600 text-white shadow-sm px-2.5 py-0.5 rounded-lg">
              ₹0.90 / card
            </span>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-[28px]">health_and_safety</span>
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors block">Ayushman PVC</span>
              <span className="text-[11px] text-slate-500 font-medium">PMJAY Health</span>
            </div>
          </Link>

          {/* e-Shram PVC */}
          <Link 
            href="/dashboard/generate?type=eshram" 
            className="group relative bg-gradient-to-b from-white to-amber-50/50 backdrop-blur-md p-5 rounded-2xl border border-amber-100 hover:border-amber-500/50 shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all flex flex-col items-center text-center gap-3 pt-7"
          >
            <span className="absolute top-2 right-2 text-[12px] font-black bg-amber-600 text-white shadow-sm px-2.5 py-0.5 rounded-lg">
              ₹0.90 / card
            </span>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-[28px]">engineering</span>
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 group-hover:text-amber-600 transition-colors block">e-Shram PVC</span>
              <span className="text-[11px] text-slate-500 font-medium">Labour Card</span>
            </div>
          </Link>

          {/* ABHA PVC */}
          <Link 
            href="/dashboard/generate?type=abha" 
            className="group relative bg-gradient-to-b from-white to-teal-50/50 backdrop-blur-md p-5 rounded-2xl border border-teal-100 hover:border-teal-500/50 shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all flex flex-col items-center text-center gap-3 pt-7"
          >
            <span className="absolute top-2 right-2 text-[12px] font-black bg-teal-600 text-white shadow-sm px-2.5 py-0.5 rounded-lg">
              ₹0.90 / card
            </span>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-[28px]">medical_services</span>
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 group-hover:text-teal-600 transition-colors block">ABHA PVC</span>
              <span className="text-[11px] text-slate-500 font-medium">ABHA Health ID</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Dynamic Advertisement Banner */}
      {banner && (
        <section className="w-full pt-2">
          {banner.link_url ? (
            <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="block transition-all hover:scale-[1.005] hover:brightness-105 duration-200 shadow-md hover:shadow-xl rounded-2xl overflow-hidden border border-slate-200/80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={banner.image_url} alt="Advertisement Banner" className="w-full h-auto object-cover max-h-[250px]" />
            </a>
          ) : (
            <div className="w-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={banner.image_url} alt="System Announcement Banner" className="w-full h-auto object-cover max-h-[250px]" />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
