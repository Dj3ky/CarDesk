"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  Tag,
  FileText,
  Settings,
  UserCog,
  X,
  BarChart2,
  ShieldCheck,
  Gauge,
  Wrench,
  Search,
} from "lucide-react";
import { useSidebar } from "./sidebar-context";
import { canAccess } from "@/lib/permissions";
import type { Module } from "@/lib/permissions";

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  module?: Module;
};

type NavGroup = {
  labelKey?: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/dashboard",   labelKey: "dashboard",  icon: LayoutDashboard },
      { href: "/customers",   labelKey: "customers",  icon: Users,      module: "customers"   },
      { href: "/offers",      labelKey: "offers",     icon: FileText,   module: "offers"      },
      { href: "/work-orders", labelKey: "workOrders", icon: Wrench,     module: "work_orders" },
    ],
  },
  {
    labelKey: "groupParts",
    items: [
      { href: "/products",     labelKey: "products",     icon: Package, module: "products"     },
      { href: "/pricelist",    labelKey: "pricelist",    icon: Tag,     module: "pricelist"    },
      { href: "/parts-catalog", labelKey: "partsCatalog", icon: Search, module: "parts_catalog" },
    ],
  },
  {
    labelKey: "groupAdmin",
    items: [
      { href: "/reports",  labelKey: "reports",  icon: BarChart2,  module: "reports"   },
      { href: "/users",    labelKey: "users",    icon: UserCog,    module: "users"     },
      { href: "/audit",    labelKey: "audit",    icon: ShieldCheck, module: "audit"    },
      { href: "/settings", labelKey: "settings", icon: Settings,   module: "settings"  },
    ],
  },
];

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function UserCard({ onNavigate }: { onNavigate?: () => void }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="border-t p-3">
      <Link
        href={`/${locale}/profile`}
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-sidebar-accent group"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/15 text-xs font-semibold text-sidebar-primary">
          {getInitials(user?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-sidebar-foreground leading-tight">
            {user?.name ?? "—"}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/50 leading-tight mt-0.5">
            {user?.role === "ADMIN" ? t("admin") : t("employee")}
          </p>
        </div>
      </Link>
    </div>
  );
}

function NavLink({
  href,
  labelKey,
  icon: Icon,
  onNavigate,
}: NavItem & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("nav");
  const fullPath = `/${locale}${href}`;
  const isActive = pathname === fullPath || pathname.startsWith(`${fullPath}/`);

  return (
    <Link
      href={fullPath}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-md py-2.5 pr-3 text-sm font-medium transition-all border-l-2 pl-[10px]",
        isActive
          ? "border-sidebar-primary bg-sidebar-accent text-sidebar-foreground"
          : "border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive
            ? "text-sidebar-primary"
            : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
        )}
      />
      {t(labelKey)}
    </Link>
  );
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const { data: session } = useSession();
  const user = session?.user;

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!item.module) return true;
      if (!user) return false;
      return canAccess(user, item.module);
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <nav className="flex-1 space-y-4 p-4">
        {visibleGroups.map((group, i) => (
          <div key={i}>
            {group.labelKey && (
              <p className="mb-1 px-[10px] text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                {t(group.labelKey)}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} {...item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <UserCard onNavigate={onNavigate} />
    </div>
  );
}

export function Sidebar() {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const locale = useLocale();
  const dashboardHref = `/${locale}/dashboard`;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 w-64 flex-col border-r bg-sidebar">
        <div className="flex h-16 items-center border-b px-6">
          <Link href={dashboardHref} className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary shadow-sm">
              <Gauge className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <span className="text-xl tracking-tight">
              <span className="font-light text-sidebar-foreground/70">Car</span>
              <span className="font-bold text-sidebar-primary">Desk</span>
            </span>
          </Link>
        </div>
        <NavContent />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col border-r bg-sidebar">
            <div className="flex h-16 items-center justify-between border-b px-6">
              <Link
                href={dashboardHref}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary shadow-sm">
                  <Gauge className="h-5 w-5 text-sidebar-primary-foreground" />
                </div>
                <span className="text-xl tracking-tight">
                  <span className="font-light text-sidebar-foreground/70">Car</span>
                  <span className="font-bold text-sidebar-primary">Desk</span>
                </span>
              </Link>
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
