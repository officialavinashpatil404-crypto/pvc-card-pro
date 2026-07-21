'use client';

import React from 'react';
import Link from 'next/link';
import { useUserContext } from './UserContext';

export function LiveCreditBadge() {
  const { remaining_cards } = useUserContext();

  return (
    <Link
      href="/dashboard/subscription"
      className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-800 px-3.5 py-1.5 rounded-full transition-all active:scale-95 shadow-sm"
    >
      <span className="material-symbols-outlined text-emerald-600 text-[18px]">account_balance_wallet</span>
      <span className="text-xs font-black">{remaining_cards} Credits</span>
      <span className="hidden sm:inline text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full">Topup</span>
    </Link>
  );
}

export function LiveProfileBadge({ initialName }: { initialName: string }) {
  const { plan } = useUserContext();

  return (
    <>
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300/80 flex items-center justify-center text-slate-700 font-bold text-sm shadow-inner">
        {initialName?.[0]?.toUpperCase() || 'O'}
      </div>
      <div className="hidden md:flex flex-col">
        <span className="text-xs font-bold text-slate-900 max-w-[120px] truncate">{initialName}</span>
        <span className="text-[10px] font-bold text-primary">{plan}</span>
      </div>
    </>
  );
}

export function LiveSidebarProfile({ initialName }: { initialName: string }) {
  const { plan } = useUserContext();

  return (
    <div className="p-3.5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-lg relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined text-[80px]">verified_user</span>
      </div>
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-400 font-bold shadow-inner">
          <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-bold text-white truncate">{initialName}</p>
          <p className="text-[11px] text-emerald-400 font-bold">{plan}</p>
          <p className="text-[10px] text-slate-300 font-medium mt-0.5">Validity: <span className="text-emerald-400 font-bold">Lifetime</span></p>
        </div>
      </div>
    </div>
  );
}
