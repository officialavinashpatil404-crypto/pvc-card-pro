'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSidebarNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "Overview & Analytics", icon: "dashboard" },
    { href: "/admin/users", label: "User Management", icon: "group" },
    { href: "/admin/finance", label: "Revenue & Finance", icon: "payments" },
    { href: "/admin/support", label: "Support Tickets", icon: "support_agent" },
    { href: "/admin/repairs", label: "Gujarati & Indic AI", icon: "auto_awesome" },
  ];

  return (
    <nav className="flex flex-col gap-1.5 flex-grow">
      {navItems.map((item) => {
        const isActive = item.href === "/admin" 
          ? pathname === "/admin" 
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 ${
              isActive
                ? "bg-primary text-white font-bold shadow-md shadow-primary/20 scale-[1.01]"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
