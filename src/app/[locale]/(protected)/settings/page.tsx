import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { getSettings } from "@/modules/settings/actions/get-settings";
import { SettingsForm } from "@/modules/settings/components/settings-form";
import { SettingsNav, type SettingsTab } from "@/modules/settings/components/settings-nav";
import { BackupPanel } from "@/modules/settings/components/backup-panel";
import { UpdatePanel } from "@/modules/settings/components/update-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const VALID_TABS: SettingsTab[] = ["company", "finance", "documents", "system", "backup", "update"];

export default async function SettingsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { tab } = await searchParams;
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    redirect(`/${locale}/dashboard`);
  }

  const activeTab: SettingsTab =
    tab && VALID_TABS.includes(tab as SettingsTab) ? (tab as SettingsTab) : "company";

  const [t, settings] = await Promise.all([
    getTranslations("settings"),
    getSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
      </div>

      <div className="flex gap-8">
        <SettingsNav activeTab={activeTab} />

        <div className="flex-1 min-w-0 max-w-2xl">
          {activeTab === "backup" ? (
            <BackupPanel />
          ) : activeTab === "update" ? (
            <UpdatePanel />
          ) : (
            <SettingsForm settings={settings} activeTab={activeTab} />
          )}
        </div>
      </div>
    </div>
  );
}
