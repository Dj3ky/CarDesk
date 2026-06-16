"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, DollarSign, FileText, Settings2, Database, GitPullRequest, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsTab = "company" | "finance" | "documents" | "system" | "pricing" | "backup" | "update";

const TABS: { key: SettingsTab; Icon: React.ElementType }[] = [
  { key: "company", Icon: Building2 },
  { key: "finance", Icon: DollarSign },
  { key: "documents", Icon: FileText },
  { key: "system", Icon: Settings2 },
  { key: "pricing", Icon: TrendingUp },
  { key: "backup", Icon: Database },
  { key: "update", Icon: GitPullRequest },
];

interface SettingsNavProps {
  activeTab: SettingsTab;
}

export function SettingsNav({ activeTab }: SettingsNavProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("settings.tabs");

  function setTab(tab: SettingsTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <nav className="flex flex-row gap-1 overflow-x-auto pb-1 sm:flex-col sm:w-40 sm:shrink-0 sm:overflow-visible sm:pb-0">
      {TABS.map(({ key, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => setTab(key)}
          className={cn(
            "group flex items-center gap-2 rounded-md py-2 px-3 text-sm font-medium transition-all text-left shrink-0 sm:w-full sm:pr-3 sm:border-l-2 sm:pl-[10px] sm:gap-2.5 border-b-2 sm:border-b-0",
            activeTab === key
              ? "border-primary bg-accent text-foreground"
              : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Icon className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            activeTab === key
              ? "text-primary"
              : "text-muted-foreground/50 group-hover:text-muted-foreground"
          )} />
          {t(key)}
        </button>
      ))}
    </nav>
  );
}
