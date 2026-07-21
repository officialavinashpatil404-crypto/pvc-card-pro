import { createClient } from "@/utils/supabase/server";
import BannerForm from "./BannerForm";
import Link from "next/link";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboard() {
  const supabase = await createClient();

  const nowDate = new Date();
  const todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).toISOString();
  const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).toISOString();

  // Fast Parallel Aggregation with Promise.all
  const [
    { count: totalUsers },
    { data: revenueData },
    { count: totalCards },
    { count: cardsToday },
    { count: cardsThisMonth },
    { data: tokenLogs },
    { data: paidUsers },
    { data: activeBanner },
    { data: recentCards }
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('payment_history').select('amount').eq('status', 'SUCCESS'),
    supabase.from('card_history').select('*', { count: 'exact', head: true }),
    supabase.from('card_history').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('card_history').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    supabase.from('gemini_token_usage').select('input_tokens, output_tokens, total_tokens, created_at, document_type').order('created_at', { ascending: false }),
    supabase.from('users').select('id, name, email, plan, remaining_cards, plan_expiry').neq('plan', 'Free').order('created_at', { ascending: false }),
    supabase.from('banners').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('card_history').select('id, user_id, document_type, status, created_at').order('created_at', { ascending: false }).limit(6)
  ]);

  const totalRevenue = revenueData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

  // Gemini Token Calculation
  let dayTokens = 0;
  let monthTokens = 0;
  let totalTokens = 0;

  const startOfDay = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);

  if (tokenLogs) {
    for (const log of tokenLogs) {
      const logDate = new Date(log.created_at);
      const tokens = Number(log.total_tokens || 0);
      totalTokens += tokens;
      if (logDate >= startOfDay) dayTokens += tokens;
      if (logDate >= startOfMonth) monthTokens += tokens;
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      {/* Control Panel Top Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Overview & System Metrics</h1>
          <p className="text-sm text-slate-600 mt-1">Real-time stats, subscription management, Gemini AI usage, and platform configuration.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">group_add</span>
            Manage Users & Credits
          </Link>
        </div>
      </div>
      
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform Users</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px]">group</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{totalUsers || 0}</p>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">Registered Accounts</p>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 font-medium mt-1.5">Cashfree Payments</p>
        </div>

        {/* Total PVC Cards Printed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cards Printed</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px]">credit_card</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-indigo-600">{totalCards || 0}</p>
          <p className="text-xs text-indigo-600 font-medium mt-1.5">Lifetime Generations</p>
        </div>

        {/* Today's Cards */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cards Today</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px]">today</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600">{cardsToday || 0}</p>
          <p className="text-xs text-amber-600 font-semibold mt-1.5 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Live Today
          </p>
        </div>

        {/* Cards This Month */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">This Month</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-600">{cardsThisMonth || 0}</p>
          <p className="text-xs text-purple-600 font-medium mt-1.5">Monthly Volume</p>
        </div>
      </div>

      {/* Gemini AI Token Billing Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-600 text-2xl">auto_awesome</span>
            <h2 className="text-lg font-bold text-slate-900">Gemini AI Token & API Cost Monitor</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Model: Gemini Flash / Pro
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 text-center">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">AI Tokens Today</p>
            <p className="text-2xl font-extrabold text-purple-700 mt-1">{dayTokens.toLocaleString()}</p>
            <p className="text-xs text-purple-600 font-semibold mt-1">
              Est. Cost: ₹{((dayTokens / 1000000) * 0.3 * 85).toFixed(2)}
            </p>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-center">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">AI Tokens This Month</p>
            <p className="text-2xl font-extrabold text-blue-700 mt-1">{monthTokens.toLocaleString()}</p>
            <p className="text-xs text-blue-600 font-semibold mt-1">
              Est. Cost: ₹{((monthTokens / 1000000) * 0.3 * 85).toFixed(2)}
            </p>
          </div>

          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-center">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total AI Tokens Logged</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{totalTokens.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">
              Total Cost: ₹{((totalTokens / 1000000) * 0.3 * 85).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Grid for Banner Form and Paid Subscribers Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Banner Management Form */}
        <BannerForm 
          initialImageUrl={activeBanner?.image_url || ''} 
          initialLinkUrl={activeBanner?.link_url || ''} 
        />

        {/* Paid Subscribers Status Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 flex flex-col h-[490px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Active Paid Subscribers</h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
              {paidUsers?.length || 0} Paid Users
            </span>
          </div>

          <div className="overflow-y-auto flex-1 pr-1">
            {!paidUsers || paidUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No active paid subscribers found. All users are on the free plan.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <th className="pb-3 pr-2">User Details</th>
                    <th className="pb-3 px-2">Plan</th>
                    <th className="pb-3 px-2 text-right">Credits</th>
                    <th className="pb-3 pl-2 text-right">Validity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paidUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-2">
                        <p className="font-bold text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {u.plan}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-extrabold text-slate-900">
                        {u.remaining_cards || 0}
                      </td>
                      <td className="py-3 pl-2 text-right text-xs font-bold text-emerald-600">
                        Lifetime
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Live Recent Card Generations Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">history</span>
            <h2 className="text-lg font-bold text-slate-900">Recent Card Generations Stream</h2>
          </div>
          <Link href="/admin/users" className="text-xs text-primary font-bold hover:underline">
            View All Users &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="pb-3 pr-4">Generation ID</th>
                <th className="pb-3 px-4">Document Type</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 pl-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentCards && recentCards.length > 0 ? (
                recentCards.map((card) => (
                  <tr key={card.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-slate-600">
                      {card.id}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                        <span className="material-symbols-outlined text-primary text-[18px]">badge</span>
                        {card.document_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        SUCCESS
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right text-xs text-slate-500 font-medium">
                      {new Date(card.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 text-sm">
                    No recent card generations recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
