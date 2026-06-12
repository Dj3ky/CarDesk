import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OfferForm } from "@/modules/offers/components/offer-form";
import { getOffer } from "@/modules/offers/actions/get-offer";
import { getCustomersForOffer } from "@/modules/offers/actions/get-customers-for-offer";
import { getSettings } from "@/modules/settings/actions/get-settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const offer = await getOffer(id);
  return { title: offer ? `Edit ${offer.offerNumber}` : "Edit Offer" };
}

interface EditOfferPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditOfferPage({ params }: EditOfferPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations("offers");

  const offer = await getOffer(id);
  if (!offer) notFound();

  if (offer.status !== "DRAFT") {
    redirect(`/${locale}/offers/${id}`);
  }

  const [customers, settings] = await Promise.all([
    getCustomersForOffer(),
    getSettings(),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("editTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground font-mono">
          {offer.offerNumber}
        </p>
      </div>

      <OfferForm
        locale={locale}
        customers={customers}
        defaultVATRate={parseFloat(settings.defaultVATRate)}
        currency={settings.currency}
        offer={offer}
      />
    </div>
  );
}
