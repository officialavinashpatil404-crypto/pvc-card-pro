import Link from "next/link";
import { resetPassword } from "../actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <main className="bg-slate-900 text-white min-h-screen grid grid-cols-1 lg:grid-cols-2 overflow-x-hidden font-body-md">
      {/* Left Side: Graphic & Brand Showcase */}
      <section className="hidden lg:flex relative bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 overflow-hidden items-center justify-center p-12 border-r border-slate-800">
        {/* Glow Spheres */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 space-y-8" style={{ maxWidth: '520px', width: '100%' }}>
          {/* Logo Badge */}
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-primary/30 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[28px]">badge</span>
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white leading-none block">
                Rapid <span className="text-primary">PVC</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Card Pro Hub</span>
            </div>
          </Link>

          {/* Heading */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Secure Account Access Recovery
            </div>
            <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
              Reset Your Operator Password Easily
            </h1>
            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              Lost your access code? Enter your registered email address below, and our automated system will dispatch a secure 256-bit encrypted password reset link to your inbox.
            </p>
          </div>

          {/* Glass Feature Box */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 p-6 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">lock_reset</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white">Instant Encrypted Password Link</p>
                <p className="text-[11px] text-slate-300">Single-use reset token with 15-minute validity window.</p>
              </div>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">verified_user</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white">ISO 27001 Certified Protection</p>
                <p className="text-[11px] text-slate-300">Your account data and credit wallet remain 100% safe.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right Side: Password Reset Form */}
      <section className="w-full bg-white text-slate-900 flex flex-col justify-between p-6 sm:p-12 lg:p-16 min-h-screen">
        <div className="w-full mx-auto my-auto space-y-8" style={{ maxWidth: '440px', width: '100%' }}>
          {/* Mobile Header Logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined text-[24px]">badge</span>
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 leading-none block">
                Rapid <span className="text-primary">PVC</span>
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Card Pro Hub</span>
            </div>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Reset Password</h2>
            <p className="text-xs font-medium text-slate-500">
              Enter your registered email address and we'll send you an instant link to set a new password.
            </p>
          </div>

          {/* Feedback Banners */}
          {resolvedSearchParams?.error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border border-red-200">
              <span className="material-symbols-outlined text-[20px] text-red-600">error</span>
              <span>{resolvedSearchParams.error}</span>
            </div>
          )}
          {resolvedSearchParams?.message && (
            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border border-emerald-200">
              <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
              <span>{resolvedSearchParams.message}</span>
            </div>
          )}

          {/* Form */}
          <form action={resetPassword} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block" htmlFor="email">
                Registered Email Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                  mail
                </span>
                <input
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-xs font-bold text-slate-900 placeholder:text-slate-400"
                  id="email"
                  name="email"
                  placeholder="e.g. operator@csc.gov.in"
                  type="email"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-6 bg-gradient-to-r from-primary via-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-sm rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
            >
              <span>Send Reset Link</span>
              <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                send
              </span>
            </button>
          </form>

          {/* Footer Back to Login */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs font-medium text-slate-500">
              Remember your password?{" "}
              <Link className="text-primary font-black hover:underline ml-1" href="/login">
                Back to Login
              </Link>
            </p>
          </div>
        </div>

        {/* Security Badge Footer */}
        <div className="w-full text-center text-slate-400 text-[11px] font-medium pt-6">
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-emerald-500">verified</span>
            ISO 27001 Encrypted & Privacy Compliant System
          </span>
        </div>
      </section>
    </main>
  );
}
