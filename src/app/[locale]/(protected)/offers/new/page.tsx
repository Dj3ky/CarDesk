import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfferForm } from "@/modules/offers/components/offer-form";
import { getCustomersForOffer } from "@/modules/offers/actions/get-customers-for-offer";
import { getSettings } from "@/modules/settings/actions/get-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("offers");
  return { title: t("newTitle") };
}

interface NewOfferPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewOfferPage({ params, searchParams }: NewOfferPageProps) {
  const { locale } = await params;
  const { customerId } = await searchParams;

  const [customers, settings, t] = await Promise.all([
    getCustomersForOffer(),
    getSettings(),
    getTranslations("offers"),
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/offers`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("title")}
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("newTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("newSubtitle")}</p>
      </div>

      <OfferForm
        locale={locale}
        customers={customers}
        defaultVATRate={parseFloat(settings.defaultVATRate)}
        currency={settings.currency}
        defaultCustomerId={typeof customerId === "string" ? customerId : undefined}
      />
    </div>
  );
}
