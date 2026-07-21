import Image from "next/image";
import Link from "next/link";
import { login } from "../actions";
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
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
              25,000+ CSC Centers Connected
            </div>
            <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
              India's #1 PVC Card Generation Platform
            </h1>
            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              Extract PDF data, auto-correct regional Indic language scripts using Google Gemini AI, and print government-spec PVC cards in under 30 seconds.
            </p>
          </div>

          {/* Glass Feature Box */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 p-6 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white">Google Gemini AI Neural Engine</p>
                <p className="text-[11px] text-slate-300">Automatic Indic language spelling repair for 8+ scripts.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">verified</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white">100% Lifetime Validity Credits</p>
                <p className="text-[11px] text-slate-300">Credits never expire. Top-up anytime with zero loss.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right Side: Login Form */}
      <section className="w-full flex items-center justify-center p-6 sm:p-12 bg-white text-slate-900">
        <div className="space-y-6" style={{ maxWidth: '460px', width: '100%' }}>
          {/* Header */}
          <div className="space-y-2 text-center lg:text-left">
            <div className="flex lg:hidden items-center justify-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-[22px]">badge</span>
              </div>
              <span className="text-xl font-black text-slate-900">Rapid PVC</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Please enter your credentials to access your operator dashboard.</p>
            
            {resolvedSearchParams?.error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center justify-center gap-2 mt-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {resolvedSearchParams.error}
              </div>
            )}
          </div>

          <GoogleSignInButton />

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Or Sign In With Email</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>
          
          <form action={login} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block" htmlFor="email">Email Address</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] group-focus-within:text-primary transition-colors">alternate_email</span>
                <input 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm" 
                  id="email" 
                  name="email" 
                  placeholder="officialoperator@gmail.com" 
                  required 
                  type="email" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 block" htmlFor="password">Password</label>
                <Link className="text-xs font-bold text-primary hover:underline" href="/forgot-password">Forgot Password?</Link>
              </div>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] group-focus-within:text-primary transition-colors">lock</span>
                <input 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm" 
                  id="password" 
                  name="password" 
                  placeholder="••••••••" 
                  required 
                  type="password" 
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" id="remember" type="checkbox" />
              <label className="text-xs font-bold text-slate-600" htmlFor="remember">Remember me for 30 days</label>
            </div>

            <button 
              className="w-full py-3.5 bg-gradient-to-r from-primary via-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 group" 
              type="submit"
            >
              Sign In to Account
              <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs font-medium text-slate-500">
              Don't have an operator account? 
              <Link className="text-primary font-black hover:underline ml-1" href="/register">Create Account</Link>
            </p>
          </div>

          <div className="pt-4 text-center border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">verified_user</span>
              ISO 27001 Encrypted & Privacy Compliant System
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
