'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav({ role }: { role?: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/dashboard/services", label: "Services", icon: "medical_services" },
    { href: "/dashboard/generate", label: "Generate Card", icon: "add_card" },
    { href: "/dashboard/history", label: "History", icon: "history" },
    { href: "/dashboard/subscription", label: "Subscription", icon: "subscriptions" },
    { href: "/dashboard/profile", label: "Profile", icon: "person" },
    { href: "/dashboard/ai-settings", label: "AI Settings", icon: "auto_awesome" },
    { href: "/dashboard/support", label: "Support", icon: "support_agent" },
  ];

  if (role === 'ADMIN') {
    navItems.push({ href: "/admin", label: "Admin Panel", icon: "admin_panel_settings" });
  }

  return (
    <nav className="flex flex-col gap-xs flex-grow overflow-y-auto pr-xs">
      {navItems.map((item) => {
        const isActive = mounted && (item.href === "/dashboard" 
          ? pathname === "/dashboard" 
          : pathname ? pathname.startsWith(item.href) : false);

        return (
          <Link
            key={item.href}
            href={item.href}
            suppressHydrationWarning
            className={`flex items-center gap-sm px-md py-sm rounded-xl transition-all duration-200 hover:translate-x-1.5 active:scale-[0.97] ${
              isActive
                ? "bg-primary/10 text-primary font-bold border border-primary/20 scale-[1.02]"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-label-md">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mobileItems = [
    { href: "/dashboard", label: "Home", icon: "dashboard" },
    { href: "/dashboard/generate", label: "Generate", icon: "add_card" },
    { href: "/dashboard/services", label: "Services", icon: "medical_services" },
    { href: "/dashboard/history", label: "History", icon: "history" },
    { href: "/dashboard/subscription", label: "Recharge", icon: "account_balance_wallet" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 z-50 flex justify-around items-center py-2 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {mobileItems.map((item) => {
        const isActive = mounted && (item.href === "/dashboard" 
          ? pathname === "/dashboard" 
          : pathname ? pathname.startsWith(item.href) : false);

        return (
          <Link
            key={item.href}
            href={item.href}
            suppressHydrationWarning
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-200 active:scale-95 ${
              isActive
                ? "text-primary font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-primary/10' : ''}`}>
              <span 
                className="material-symbols-outlined text-[22px]" 
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : undefined }}
              >
                {item.icon}
              </span>
            </div>
            <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
