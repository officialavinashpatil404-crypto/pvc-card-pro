import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isAdminUser } from "@/utils/auth";
import AdminSidebarNav from "./AdminSidebarNav";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="bg-slate-50/70 text-slate-900 font-body-md min-h-screen flex flex-col">
      {/* Admin Top App Bar */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-50 shadow-sm">
        <div className="flex justify-between items-center px-4 md:px-6 py-3 max-w-[1440px] mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white font-extrabold shadow-md">
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">Rapid PVC Admin</span>
              <span className="ml-2.5 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Control Center
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* System Status Indicators */}
            <div className="hidden sm:flex items-center gap-3 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/60 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                DB: <strong className="text-emerald-700">Active</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Cashfree: <strong className="text-emerald-700 font-semibold">Live</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                AI: <strong className="text-emerald-700 font-semibold">Online</strong>
              </span>
            </div>

            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-label-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">space_dashboard</span>
              User Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="flex w-full max-w-[1440px] mx-auto flex-grow">
        {/* Admin Sidebar */}
        <aside className="w-64 bg-white/90 backdrop-blur-xl border-r border-slate-200/80 hidden lg:flex flex-col gap-base p-4 pt-6 shrink-0">
          <div className="px-3 mb-4 flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
              {user.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">{user.user_metadata?.name || 'Administrator'}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          <AdminSidebarNav />
        </aside>

        {/* Admin Main Content Area */}
        <main className="flex-grow p-4 md:p-8 min-h-[calc(100vh-64px)] overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
