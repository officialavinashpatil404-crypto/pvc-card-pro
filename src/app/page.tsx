'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={`min-h-screen transition-colors duration-300 font-body-md selection:bg-primary/30 selection:text-white overflow-x-hidden ${
      isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-300 ${
        isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200/80 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[24px]">badge</span>
            </div>
            <div className="flex flex-col">
              <span className={`text-xl font-black tracking-tight leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Rapid <span className="text-primary">PVC</span>
              </span>
              <span className={`text-[10px] font-extrabold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Card Pro Hub</span>
            </div>
          </Link>

          <nav className={`hidden md:flex items-center gap-8 text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#services" className="hover:text-primary transition-colors">Supported Cards</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQs</a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Day / Night Theme Toggle Button */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 ${
                isDark 
                  ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700' 
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title={isDark ? "Switch to Day Mode (Light)" : "Switch to Night Mode (Dark)"}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
              <span className="hidden sm:inline">{isDark ? 'Day Mode' : 'Night Mode'}</span>
            </button>

            <Link
              href="/login"
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2.5 bg-gradient-to-r from-primary via-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-black rounded-xl shadow-md shadow-primary/20 active:scale-95 transition-all"
            >
              Start Trial – ₹20
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden">
        {/* Glow Effects */}
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none ${
          isDark ? 'bg-primary/20' : 'bg-blue-400/20'
        }`}></div>

        <div className="relative z-10 text-center space-y-6 max-w-4xl mx-auto">
          {/* Powered by Next-Gen AI Badge */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-1">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-extrabold shadow-sm ${
              isDark ? 'bg-purple-900/40 border-purple-500/50 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'
            }`}>
              <span className="material-symbols-outlined text-[16px] animate-spin">auto_awesome</span>
              POWERED BY NEXT-GEN GOOGLE GEMINI AI CORE
            </div>

            <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-bold shadow-sm ${
              isDark ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'
            }`}>
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
              🇮🇳 Pure Bharat Mein 1 Mahine Ke Andar 25,000+ CSC & Cyber Cafe Wale Jud Chuke Hain!
            </div>
          </div>

          <h1 className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            India's #1 AI-Powered Fast & Automatic <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-emerald-500">
              PVC Card Printing Software
            </span>
          </h1>

          <p className={`text-sm sm:text-base max-w-2xl mx-auto font-medium leading-relaxed ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}>
            Powered by Next-Gen Google Gemini Neural AI Core. Extract e-Aadhaar, PAN, Ayushman PMJAY, Voting Card (EPIC), e-Shram & ABHA PDFs in 1-Click. Automatic regional Indic language AI correction, exact government print specs, zero alignment errors.
          </p>

          {/* CTA Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
              Start Printing Now (10 Credits for ₹20)
            </Link>
            <a
              href="#pricing"
              className={`w-full sm:w-auto px-8 py-4 border font-bold text-sm rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
              View Credit Top-up Packs
            </a>
          </div>

          {/* Social Proof Features List */}
          <div className={`pt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-bold ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="material-symbols-outlined text-[18px]">verified</span> 100% Lifetime Validity
            </span>
            <span className="flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span> AI Indic Script Repair
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="material-symbols-outlined text-[18px]">lock</span> 5-Min Server Auto-Delete
            </span>
            <span className="flex items-center gap-1.5 text-purple-600">
              <span className="material-symbols-outlined text-[18px]">print</span> A4 Sheet & Single Card Export
            </span>
          </div>
        </div>
      </section>

      {/* ── Impact Metrics Bar ──────────────────────────────────────────────── */}
      <section className={`border-y py-10 px-4 sm:px-6 transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-amber-500">25,000+</p>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>CSC & Cyber Cafe Operators</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-primary">5,00,000+</p>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>PVC Cards Generated</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-emerald-500">99.9%</p>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>AI Indic Repair Accuracy</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-purple-500">100%</p>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Government Specification</p>
          </div>
        </div>
      </section>

      {/* ── Key Features ("Tool Ki Khasiyat & Tareef") ─────────────────────── */}
      <section id="features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            Kyun Rapid PVC Pro Sabse Best Hai?
          </span>
          <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Rapid PVC Card Pro Ki Special Khasiyat
          </h2>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Cyber Cafe aur CSC Center wale is tool ko kyun sabse zyada pasand karte hain? Dekhein hamari exclusive features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className={`p-6 rounded-3xl border space-y-3 transition-all group ${
            isDark ? 'bg-slate-900/50 border-slate-800 hover:border-primary/50' : 'bg-white border-slate-200/80 shadow-sm hover:shadow-xl hover:border-primary/50'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
            </div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>1-Click Automatic Data Extraction</h3>
            <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Password-protected e-Aadhaar, PAN, ya Ayushman PDF drag karein. Photo, QR Code, Name, Address, aur Details automatically extract ho jayengi.
            </p>
          </div>

          {/* Feature 2 */}
          <div className={`p-6 rounded-3xl border space-y-3 transition-all group ${
            isDark ? 'bg-slate-900/50 border-slate-800 hover:border-emerald-500/50' : 'bg-white border-slate-200/80 shadow-sm hover:shadow-xl hover:border-emerald-500/50'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[28px]">translate</span>
            </div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>AI Regional Language Spelling Engine</h3>
            <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Gujarati, Marathi, Hindi, Tamil, Telugu, Kannada, Bengali script corruption ko AI dwara automatically repair karein taaki print ekdum perfect aaye.
            </p>
          </div>

          {/* Feature 3 */}
          <div className={`p-6 rounded-3xl border space-y-3 transition-all group ${
            isDark ? 'bg-slate-900/50 border-slate-800 hover:border-purple-500/50' : 'bg-white border-slate-200/80 shadow-sm hover:shadow-xl hover:border-purple-500/50'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[28px]">verified</span>
            </div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Lifetime Validity Credits</h3>
            <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Credits kabhi expire nahi honge! Jab marzi tab use karein. Naye top-up par bache hue credits automatically naye balance me add ho jate hain.
            </p>
          </div>

          {/* Feature 4 */}
          <div className={`p-6 rounded-3xl border space-y-3 transition-all group ${
            isDark ? 'bg-slate-900/50 border-slate-800 hover:border-amber-500/50' : 'bg-white border-slate-200/80 shadow-sm hover:shadow-xl hover:border-amber-500/50'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[28px]">print</span>
            </div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Exact Government Print Dimensions</h3>
            <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Official UIDAI 300 DPI (1013x638px) PVC layout. Direct A4 print sheet download karein ya Single PVC card printer me print karein.
            </p>
          </div>

          {/* Feature 5 */}
          <div className={`p-6 rounded-3xl border space-y-3 transition-all group ${
            isDark ? 'bg-slate-900/50 border-slate-800 hover:border-teal-500/50' : 'bg-white border-slate-200/80 shadow-sm hover:shadow-xl hover:border-teal-500/50'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[28px]">shield_lock</span>
            </div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>100% Privacy & 5-Min Auto-Delete</h3>
            <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Aapke customer ka data 100% encrypted aur safe rehta hai. File generation ke 5 minute baad server se automatically permanent delete ho jata hai.
            </p>
          </div>

          {/* Feature 6 */}
          <div className={`p-6 rounded-3xl border space-y-3 transition-all group ${
            isDark ? 'bg-slate-900/50 border-slate-800 hover:border-red-500/50' : 'bg-white border-slate-200/80 shadow-sm hover:shadow-xl hover:border-red-500/50'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[28px]">bolt</span>
            </div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Instant Cashfree Checkout</h3>
            <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              UPI, PhonePe, Google Pay, Paytm, Credit/Debit card se 10 seconds me instant top-up karein. Credits immediately aapke account me add honge.
            </p>
          </div>
        </div>
      </section>

      {/* ── Supported Services Grid ─────────────────────────────────────────── */}
      <section id="services" className={`py-16 px-4 sm:px-6 max-w-7xl mx-auto space-y-8 rounded-3xl border ${
        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-blue-50/50 border-blue-100'
      }`}>
        <div className="text-center space-y-2">
          <h2 className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Supported PVC Cards</h2>
          <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Sabhi 6 mukhya sarkari card types ek hi dashboard me available hain.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className={`p-4 rounded-2xl border text-center space-y-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className="material-symbols-outlined text-blue-600 text-[32px]">fingerprint</span>
            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Aadhaar PVC</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center space-y-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className="material-symbols-outlined text-indigo-600 text-[32px]">credit_card</span>
            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>PAN Card PVC</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center space-y-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className="material-symbols-outlined text-emerald-600 text-[32px]">health_and_safety</span>
            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Ayushman PVC</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center space-y-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className="material-symbols-outlined text-amber-600 text-[32px]">engineering</span>
            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>e-Shram PVC</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center space-y-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className="material-symbols-outlined text-sky-600 text-[32px]">how_to_vote</span>
            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Voter ID PVC</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center space-y-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className="material-symbols-outlined text-teal-600 text-[32px]">medical_services</span>
            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>ABHA Health PVC</p>
          </div>
        </div>
      </section>

      {/* ── Pricing Top-Up Section ──────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Lifetime Validity Packs
          </span>
          <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Select Your Credit Top-Up Pack
          </h2>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            No monthly subscription pressure. Credits never expire. Recharge whenever your balance gets low.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {/* Trial Pack */}
          <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-6 transition-all ${
            isDark ? 'bg-slate-900/70 border-slate-800 hover:border-emerald-500/50' : 'bg-white border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-500/50'
          }`}>
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                🔥 First-Time Trial
              </span>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Trial Pack</h3>
              <div>
                <span className={`text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>₹20</span>
                <span className="text-xs text-emerald-600 font-bold ml-2">/ 10 Credits</span>
              </div>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Perfect for testing print quality before upgrading.</p>
              <ul className={`space-y-2 text-xs font-medium pt-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> 10 Card Credits</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> All 6 Card Types</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span> Lifetime Validity</li>
                <li className="flex items-center gap-2 font-bold text-emerald-600"><span className="material-symbols-outlined text-[18px]">payments</span> Cost: ₹2.00 / card</li>
              </ul>
            </div>
            <Link
              href="/register"
              className={`w-full py-3 text-center font-bold text-xs rounded-xl transition-all ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
              }`}
            >
              Buy Trial – ₹20
            </Link>
          </div>

          {/* Starter Pack */}
          <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-6 transition-all ${
            isDark ? 'bg-slate-900/70 border-slate-800 hover:border-primary/50' : 'bg-white border-slate-200 shadow-sm hover:shadow-xl hover:border-primary/50'
          }`}>
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                Starter Pack
              </span>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Starter Pack</h3>
              <div>
                <span className={`text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>₹360</span>
                <span className="text-xs text-primary font-bold ml-2">/ 400 Credits</span>
              </div>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Great for active cyber cafes and CSC operators.</p>
              <ul className={`space-y-2 text-xs font-medium pt-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span> 400 Card Credits</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span> AI Language Repair</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span> Lifetime Validity</li>
                <li className="flex items-center gap-2 font-bold text-emerald-600"><span className="material-symbols-outlined text-[18px]">payments</span> Cost: ₹0.90 / card</li>
              </ul>
            </div>
            <Link
              href="/register"
              className="w-full py-3 text-center bg-primary hover:brightness-110 text-white font-bold text-xs rounded-xl transition-all"
            >
              Buy Starter – ₹360
            </Link>
          </div>

          {/* Pro Pack (Popular) */}
          <div className={`p-6 rounded-3xl border-2 border-primary shadow-xl flex flex-col justify-between space-y-6 relative scale-105 z-10 ${
            isDark ? 'bg-gradient-to-b from-slate-900 to-indigo-950/80' : 'bg-gradient-to-b from-white to-blue-50/80'
          }`}>
            <span className="absolute -top-3 right-6 text-[10px] font-black uppercase tracking-wider text-white bg-primary px-3 py-1 rounded-full shadow-md">
              Most Popular
            </span>
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/20 px-2.5 py-1 rounded-full border border-primary/30">
                Pro Pack
              </span>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Pro Pack</h3>
              <div>
                <span className={`text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>₹720</span>
                <span className="text-xs text-primary font-bold ml-2">/ 800 Credits</span>
              </div>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Best value for high-volume CSC centers.</p>
              <ul className={`space-y-2 text-xs font-medium pt-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span> 800 Card Credits</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span> AI Language Repair</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span> Lifetime Validity</li>
                <li className="flex items-center gap-2 font-bold text-emerald-600"><span className="material-symbols-outlined text-[18px]">payments</span> Cost: ₹0.90 / card</li>
              </ul>
            </div>
            <Link
              href="/register"
              className="w-full py-3.5 text-center bg-gradient-to-r from-primary to-blue-600 hover:brightness-110 text-white font-black text-xs rounded-xl shadow-md transition-all"
            >
              Buy Pro Pack – ₹720
            </Link>
          </div>

          {/* Business Pack */}
          <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-6 transition-all ${
            isDark ? 'bg-slate-900/70 border-slate-800 hover:border-purple-500/50' : 'bg-white border-slate-200 shadow-sm hover:shadow-xl hover:border-purple-500/50'
          }`}>
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                Business Pack
              </span>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Business Pack</h3>
              <div>
                <span className={`text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>₹1,260</span>
                <span className="text-xs text-purple-600 font-bold ml-2">/ 1400 Credits</span>
              </div>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Maximum savings for bulk card distributors.</p>
              <ul className={`space-y-2 text-xs font-medium pt-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-purple-600 text-[18px]">check_circle</span> 1400 Card Credits</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-purple-600 text-[18px]">check_circle</span> Priority Processing Queue</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-purple-600 text-[18px]">check_circle</span> Lifetime Validity</li>
                <li className="flex items-center gap-2 font-bold text-emerald-600"><span className="material-symbols-outlined text-[18px]">payments</span> Cost: ₹0.90 / card</li>
              </ul>
            </div>
            <Link
              href="/register"
              className={`w-full py-3 text-center font-bold text-xs rounded-xl transition-all ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
              }`}
            >
              Buy Business – ₹1,260
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ────────────────────────────────────────────────────── */}
      <section id="faq" className="py-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Frequently Asked Questions</h2>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Aapke sabhi sawalon ke jawab yahan hain.</p>
        </div>

        <div className="space-y-4">
          <div className={`p-5 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Q: Kya mere khareede hue credits expire hote hain?</h4>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nahi! Rapid PVC Pro par sabhi credit top-ups ki <strong>Lifetime Validity</strong> hoti hai. Aap jab tak chahein credits ko use kar sakte hain.</p>
          </div>

          <div className={`p-5 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Q: Aadhaar PDF me password laga hai, kya ye extract karega?</h4>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Haan! File upload karte hi password enter karne ka option aata hai. Tool instant PDF unlock karke photo, QR code, aur details extract kar leta hai.</p>
          </div>

          <div className={`p-5 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Q: Gujarati / Marathi / Regional language spelling galat to nahi aayegi?</h4>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Humare tool me in-built AI Indic Script Engine lagaya gaya hai jo PDF subsets se hone vali matra/spelling galtiyon ko 99.9% accuracy se auto-correct kar deta hai.</p>
          </div>

          <div className={`p-5 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Q: Payment karne ke kitni der me credits milte hain?</h4>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Instant! Cashfree Payment Gateway se UPI / QR / Card dwara payment hote hi 5 seconds me credits aapke wallet me add ho jate hain.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className={`border-t py-12 px-4 sm:px-6 transition-colors ${
        isDark ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-900 text-slate-400 border-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Rapid PVC Pro</span> &bull; &copy; {new Date().getFullYear()} All rights reserved.
          </div>
          <div className="flex items-center gap-6 font-medium">
            <Link href="/privacy-policy" className="hover:text-slate-300">Privacy Policy</Link>
            <Link href="/terms-conditions" className="hover:text-slate-300">Terms of Service</Link>
            <Link href="/refund-policy" className="hover:text-slate-300">Refund Policy</Link>
            <Link href="/contact" className="hover:text-slate-300">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
