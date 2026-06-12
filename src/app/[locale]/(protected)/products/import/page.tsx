import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Upload } from "lucide-react";
import { ImportWizard } from "@/modules/import/components/import-wizard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("import");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProductImportPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    redirect(`/${locale}/products`);
  }

  const t = await getTranslations("import");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Upload className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
      </div>

      <ImportWizard locale={locale} />
    </div>
  );
}
