"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, DollarSign, FileText, Settings2, Database, GitPullRequest } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsTab = "company" | "finance" | "documents" | "system" | "backup" | "update";

const TABS: { key: SettingsTab; Icon: React.ElementType }[] = [
  { key: "company", Icon: Building2 },
  { key: "finance", Icon: DollarSign },
  { key: "documents", Icon: FileText },
  { key: "system", Icon: Settings2 },
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
    <nav className="flex flex-col gap-1 w-40 shrink-0">
      {TABS.map(({ key, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => setTab(key)}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors text-left w-full",
            activeTab === key
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {t(key)}
        </button>
      ))}
    </nav>
  );
}
