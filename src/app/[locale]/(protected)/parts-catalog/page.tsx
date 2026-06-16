import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/permissions";
import { Search } from "lucide-react";
import { getSettings } from "@/modules/settings/actions/get-settings";
import { PartsCatalogSearch } from "@/modules/parts-catalog/components/parts-catalog-search";
import { AlertCircle } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("partsCatalog");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function PartsCatalogPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await auth();

  if (!canAccess(session?.user ?? { role: "", permissions: [] }, "parts_catalog")) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations("partsCatalog");
  const settings = await getSettings();
  const hasApiKey = !!settings.partsCatalogApiKey;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Search className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
      </div>

      {!hasApiKey && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t("noApiKey")}
        </div>
      )}

      <PartsCatalogSearch />
    </div>
  );
}
