import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { getSettings } from "@/modules/settings/actions/get-settings";
import { SettingsForm } from "@/modules/settings/components/settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    redirect(`/${locale}/dashboard`);
  }

  const [t, settings] = await Promise.all([
    getTranslations("settings"),
    getSettings(),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
