'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createPaymentSession } from './actions';

interface UserData {
  plan?: string;
  remaining_cards?: number;
  plan_expiry?: string;
  trial_used?: boolean;
}

interface SubscriptionClientProps {
  userData: UserData | null;
}

export default function SubscriptionClient({ userData }: SubscriptionClientProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const userPlan = userData?.plan || 'Free';
  const remaining = userData?.remaining_cards || 0;

  const loadCashfreeScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Cashfree) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (planId: 'trial' | 'starter' | 'pro' | 'business') => {
    try {
      setLoadingPlan(planId);
      const res = await createPaymentSession(planId);
      if (res && res.sessionId) {
        await loadCashfreeScript();
        if ((window as any).Cashfree) {
          const cashfree = (window as any).Cashfree({
            mode: res.isProduction ? "production" : "sandbox"
          });
          cashfree.checkout({
            paymentSessionId: res.sessionId,
            redirectTarget: "_self"
          });
        } else {
          alert("Failed to load Cashfree Payment SDK. Please check your internet connection.");
          setLoadingPlan(null);
        }
      } else {
        alert("Failed to initialize payment session. Try again.");
        setLoadingPlan(null);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error initializing payment: ${err.message || 'Payment gateway connection error'}`);
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-lg animate-fade-in pb-xl">
      {/* Page Header with Live Balance Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md bg-white/80 backdrop-blur-md p-lg rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs font-bold">Credit Recharge & Top Up</h1>
          <p className="font-body-md text-body-md text-on-surface-variant" style={{ maxWidth: '650px' }}>
            Select a credit pack to top up your account. All credits come with <strong className="text-emerald-600 font-bold">Lifetime Validity</strong> and never expire.
          </p>
        </div>
        <div className="flex items-center gap-md bg-emerald-50/80 border border-emerald-200/70 px-lg py-md rounded-xl shrink-0">
          <span className="material-symbols-outlined text-emerald-600 text-[32px]">account_balance_wallet</span>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Your Balance</p>
            <p className="text-headline-lg font-extrabold text-emerald-700">{remaining} Credits</p>
          </div>
        </div>
      </div>

      {/* Credit Recharge Packs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg items-stretch pt-md">
        {/* Trial Pack Card */}
        <div className="relative bg-surface-container-lowest rounded-2xl p-lg flex flex-col border border-slate-200 hover:border-emerald-500/50 transition-all group shadow-sm pt-xl">
          <div className="absolute top-0 right-0 bg-emerald-600 text-white px-md py-xs rounded-bl-xl rounded-tr-lg text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: '#10b981' }}>
            🔥 FIRST TIME TRIAL
          </div>
          <h4 className="font-headline-md text-headline-md text-on-surface mb-xs mt-xs font-bold">Trial Pack</h4>
          <div className="mb-md flex flex-col">
            <div className="flex items-baseline gap-xs">
              <span className="font-headline-xl text-[36px] font-bold text-on-surface">₹20</span>
              <span className="font-body-md text-body-md text-emerald-600 font-bold">/ 10 Credits</span>
            </div>
            <span className="text-xs text-on-surface-variant/80 font-medium mt-xs">
              Perfect for testing print quality before upgrading.
            </span>
          </div>
          <ul className="flex flex-col gap-sm mb-xl flex-grow">
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span> 10 Card Credits
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span> Aadhaar, Ayushman, PAN, Voter, ABHA, e-Shram
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span> AI Local Language Repair
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span> Lifetime Validity (No Expiry)
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 mt-xs">
              <span className="material-symbols-outlined text-[20px]">payments</span> Cost per Card: ₹2.00
            </li>
          </ul>
          <button 
            disabled={loadingPlan !== null}
            onClick={() => handleSubscribe('trial')}
            className="w-full py-md border border-primary text-primary rounded-xl font-label-md text-label-md hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-xs mt-auto font-bold"
          >
            {loadingPlan === 'trial' ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Redirecting…
              </>
            ) : (
              'Buy Trial Pack – ₹20'
            )}
          </button>
        </div>

        {/* Starter Pack Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-lg flex flex-col border border-slate-200 hover:border-primary/40 transition-all group shadow-sm">
          <h4 className="font-headline-md text-headline-md text-on-surface mb-xs font-bold">Starter Pack</h4>
          <div className="mb-md flex flex-col">
            <div className="flex items-baseline gap-xs">
              <span className="font-headline-xl text-[36px] font-bold text-on-surface">₹360</span>
              <span className="font-body-md text-body-md text-primary font-bold">/ 400 Credits</span>
            </div>
            <span className="text-xs text-on-surface-variant/80 font-medium mt-xs">
              Great for active cyber cafes and CSC operators.
            </span>
          </div>
          <ul className="flex flex-col gap-sm mb-xl flex-grow">
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface font-semibold">
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span> 400 Card Credits
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span> All Card Types Supported
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span> AI Language Correction
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span> Lifetime Validity (No Expiry)
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 mt-xs">
              <span className="material-symbols-outlined text-[20px]">payments</span> Cost per Card: ₹0.90
            </li>
          </ul>
          <button 
            disabled={loadingPlan !== null}
            onClick={() => handleSubscribe('starter')}
            className="w-full py-md border border-primary text-primary rounded-xl font-label-md text-label-md hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-xs font-bold"
          >
            {loadingPlan === 'starter' ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Redirecting…
              </>
            ) : (
              'Buy Starter – ₹360'
            )}
          </button>
        </div>

        {/* Pro Card (Recommended) */}
        <div className="relative bg-surface-container-lowest rounded-2xl p-lg flex flex-col border-2 border-primary shadow-lg scale-105 z-10">
          <div className="absolute top-0 right-0 bg-primary text-on-primary px-md py-xs rounded-bl-xl rounded-tr-lg text-xs font-bold uppercase tracking-wider">
            Most Popular
          </div>
          <h4 className="font-headline-md text-headline-md text-primary mb-xs mt-xs font-bold">Pro Pack</h4>
          <div className="mb-md flex flex-col">
            <div className="flex items-baseline gap-xs">
              <span className="font-headline-xl text-[36px] font-bold text-on-surface">₹720</span>
              <span className="font-body-md text-body-md text-primary font-bold">/ 800 Credits</span>
            </div>
            <span className="text-xs text-primary font-semibold mt-xs">Best value for high-volume CSC centers</span>
          </div>
          <ul className="flex flex-col gap-sm mb-xl flex-grow">
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface font-semibold">
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span> 800 Card Credits
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span> All Card Types Supported
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span> AI Language Correction
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span> Lifetime Validity (No Expiry)
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 mt-xs">
              <span className="material-symbols-outlined text-[20px]">payments</span> Cost per Card: ₹0.90
            </li>
          </ul>
          <button 
            disabled={loadingPlan !== null}
            onClick={() => handleSubscribe('pro')}
            className="w-full py-md bg-primary text-on-primary rounded-xl font-label-md text-label-md shadow-md hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-xs font-bold"
          >
            {loadingPlan === 'pro' ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Redirecting…
              </>
            ) : (
              'Buy Pro – ₹720'
            )}
          </button>
        </div>

        {/* Business Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-lg flex flex-col border border-slate-200 hover:border-primary/40 transition-all shadow-sm">
          <h4 className="font-headline-md text-headline-md text-on-surface mb-xs font-bold">Business Pack</h4>
          <div className="mb-md flex flex-col">
            <div className="flex items-baseline gap-xs">
              <span className="font-headline-xl text-[36px] font-bold text-on-surface">₹1,260</span>
              <span className="font-body-md text-body-md text-primary font-bold">/ 1400 Credits</span>
            </div>
            <span className="text-xs text-on-surface-variant/80 font-medium mt-xs">
              Maximum savings for bulk card distributors.
            </span>
          </div>
          <ul className="flex flex-col gap-sm mb-xl flex-grow">
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface font-semibold">
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span> 1400 Card Credits
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span> All Card Types Supported
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span> AI Language Correction
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span> Lifetime Validity (No Expiry)
            </li>
            <li className="flex items-center gap-sm font-body-sm text-body-sm text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 mt-xs">
              <span className="material-symbols-outlined text-[20px]">payments</span> Cost per Card: ₹0.90
            </li>
          </ul>
          <button 
            disabled={loadingPlan !== null}
            onClick={() => handleSubscribe('business')}
            className="w-full py-md border border-primary text-primary rounded-xl font-label-md text-label-md hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-xs font-bold"
          >
            {loadingPlan === 'business' ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Redirecting…
              </>
            ) : (
              'Buy Business – ₹1,260'
            )}
          </button>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-surface-container-lowest border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm mt-xl">
        <div className="p-lg border-b border-slate-200/80 bg-slate-50">
          <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Compare Credit Packs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200/60 bg-slate-50/50">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Feature</th>
                <th className="p-md font-label-md text-label-md text-center text-on-surface-variant">Starter</th>
                <th className="p-md font-label-md text-label-md text-center text-primary">Pro</th>
                <th className="p-md font-label-md text-label-md text-center text-on-surface-variant">Business</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-on-surface">
              <tr className="hover:bg-primary/5 transition-colors">
                <td className="p-md font-medium">Total Card Credits (All Types)</td>
                <td className="p-md text-center">400</td>
                <td className="p-md text-center font-bold text-primary">800</td>
                <td className="p-md text-center">1400</td>
              </tr>
              <tr className="hover:bg-primary/5 transition-colors">
                <td className="p-md font-medium">Validity Period</td>
                <td className="p-md text-center font-semibold text-emerald-600">Lifetime</td>
                <td className="p-md text-center font-bold text-emerald-600">Lifetime</td>
                <td className="p-md text-center font-semibold text-emerald-600">Lifetime</td>
              </tr>
              <tr className="hover:bg-primary/5 transition-colors">
                <td className="p-md font-medium">Credit Deduction per Print</td>
                <td className="p-md text-center font-semibold text-slate-700">1 Credit / print</td>
                <td className="p-md text-center font-bold text-primary">1 Credit / print</td>
                <td className="p-md text-center font-semibold text-slate-700">1 Credit / print</td>
              </tr>
              <tr className="hover:bg-primary/5 transition-colors">
                <td className="p-md font-medium">AI Local Language Repair</td>
                <td className="p-md text-center">Yes</td>
                <td className="p-md text-center font-bold text-primary">Yes</td>
                <td className="p-md text-center">Yes</td>
              </tr>
              <tr className="hover:bg-primary/5 transition-colors">
                <td className="p-md font-medium">Customer Support</td>
                <td className="p-md text-center text-on-surface-variant">Standard Support</td>
                <td className="p-md text-center font-bold text-primary">Priority Support</td>
                <td className="p-md text-center">Priority Support</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
