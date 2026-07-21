import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import { isAdminUser } from "@/utils/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
  }

  async function addCredits(formData: FormData) {
    'use server'
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      throw new Error("Forbidden: Admin access required");
    }

    const uid = formData.get('userId') as string;
    const amount = Number(formData.get('amount'));
    const planName = (formData.get('planName') as string) || 'Pro Pack';
    
    if (!uid || !amount) return;

    const supabaseAdmin = await createClient();
    const { data: user } = await supabaseAdmin.from('users').select('remaining_cards').eq('id', uid).single();
    
    if (user) {
      await supabaseAdmin.from('users').update({
        plan: planName,
        remaining_cards: (user.remaining_cards || 0) + amount,
        plan_expiry: null
      }).eq('id', uid);
      revalidatePath('/admin/users');
      revalidatePath('/dashboard');
    }
  }

  async function resetUserCredits(formData: FormData) {
    'use server'
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      throw new Error("Forbidden: Admin access required");
    }

    const uid = formData.get('userId') as string;
    if (!uid) return;

    const supabaseAdmin = await createClient();
    await supabaseAdmin.from('users').update({
      plan: 'Free',
      remaining_cards: 0,
      plan_expiry: null,
    }).eq('id', uid);

    revalidatePath('/admin/users');
    revalidatePath('/dashboard');
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">User Management & Credit Control</h1>
          <p className="text-sm text-slate-600 mt-1">Manage user accounts, top up credits per exact plan, or reset unpaid accounts to 0.</p>
        </div>
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl text-xs font-bold text-blue-800">
          <span className="material-symbols-outlined text-[20px]">people</span>
          Total Users: {users?.length || 0}
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-semibold">
                <th className="p-4">User Details</th>
                <th className="p-4">Plan Name</th>
                <th className="p-4 text-right">Remaining Credits</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4 text-center">Admin Credit Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users && users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                      {u.mobile && <div className="text-xs text-slate-400 font-mono">{u.mobile}</div>}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-xs uppercase tracking-wide border ${
                        u.plan === 'Free' || !u.plan 
                          ? 'bg-slate-100 text-slate-600 border-slate-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {u.plan || 'Free'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-lg font-extrabold text-slate-900">{u.remaining_cards || 0}</span>
                      <span className="text-xs text-slate-500 font-medium ml-1">credits</span>
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-600">
                      {format(new Date(u.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2 flex-wrap items-center">
                        {/* +10 Trial */}
                        <form action={addCredits} className="inline-flex">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="amount" value="10" />
                          <input type="hidden" name="planName" value="Trial Pack" />
                          <button type="submit" className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-lg hover:bg-emerald-100 transition-all active:scale-95">
                            +10 Trial (₹20)
                          </button>
                        </form>

                        {/* +400 Starter */}
                        <form action={addCredits} className="inline-flex">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="amount" value="400" />
                          <input type="hidden" name="planName" value="Starter Pack" />
                          <button type="submit" className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs rounded-lg hover:bg-blue-100 transition-all active:scale-95">
                            +400 Starter (₹360)
                          </button>
                        </form>

                        {/* +800 Pro */}
                        <form action={addCredits} className="inline-flex">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="amount" value="800" />
                          <input type="hidden" name="planName" value="Pro Pack" />
                          <button type="submit" className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-lg hover:bg-indigo-100 transition-all active:scale-95">
                            +800 Pro (₹720)
                          </button>
                        </form>

                        {/* +1400 Business */}
                        <form action={addCredits} className="inline-flex">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="amount" value="1400" />
                          <input type="hidden" name="planName" value="Business Pack" />
                          <button type="submit" className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 font-bold text-xs rounded-lg hover:bg-purple-100 transition-all active:scale-95">
                            +1400 Business (₹1,260)
                          </button>
                        </form>

                        {/* Reset to 0 (Free) */}
                        <form action={resetUserCredits} className="inline-flex">
                          <input type="hidden" name="userId" value={u.id} />
                          <button
                            type="submit"
                            title="Reset user to 0 credits (Free Plan)"
                            className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 font-bold text-xs rounded-lg hover:bg-red-100 transition-all active:scale-95 whitespace-nowrap"
                          >
                            🔴 Reset 0 Credits (Free)
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 font-medium">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
