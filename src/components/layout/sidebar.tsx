"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  Tag,
  FileText,
  Settings,
  User,
  X,
} from "lucide-react";
import { useSidebar } from "./sidebar-context";

const navItems = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/customers", labelKey: "customers", icon: Users },
  { href: "/products",  labelKey: "products",  icon: Package },
  { href: "/pricelist", labelKey: "pricelist", icon: Tag },
  { href: "/offers",    labelKey: "offers",    icon: FileText },
  { href: "/profile",   labelKey: "profile",   icon: User },
  { href: "/settings",  labelKey: "settings",  icon: Settings },
] as const;

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("nav");

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-4">
      {navItems.map(({ href, labelKey, icon: Icon }) => {
        const fullPath = `/${locale}${href}`;
        const isActive =
          pathname === fullPath || pathname.startsWith(`${fullPath}/`);
        return (
          <Link
            key={href}
            href={fullPath}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const { mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      {/* Desktop sidebar — always visible at md+ */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 w-64 flex-col border-r bg-sidebar">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-xl font-bold text-sidebar-primary">CarDesk</span>
        </div>
        <NavContent />
      </aside>

      {/* Mobile sidebar — overlay drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative z-10 flex w-64 flex-col border-r bg-sidebar">
            <div className="flex h-16 items-center justify-between border-b px-6">
              <span className="text-xl font-bold text-sidebar-primary">CarDesk</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
