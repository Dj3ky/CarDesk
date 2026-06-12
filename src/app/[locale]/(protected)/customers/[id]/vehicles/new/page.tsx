import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleForm } from "@/modules/vehicles/components/vehicle-form";
import { getCustomer } from "@/modules/customers/actions/get-customer";

interface NewVehiclePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: NewVehiclePageProps): Promise<Metadata> {
  const t = await getTranslations("vehicles");
  return { title: t("newTitle") };
}

export default async function NewVehiclePage({ params }: NewVehiclePageProps) {
  const { locale, id } = await params;
  const t = await getTranslations();
  const customer = await getCustomer(id);

  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${locale}/customers`} className="hover:text-foreground">
          {t("customers.title")}
        </Link>
        <span>/</span>
        <Link href={`/${locale}/customers/${id}`} className="hover:text-foreground">
          {customer.firstName} {customer.lastName}
        </Link>
        <span>/</span>
        <span className="text-foreground">{t("vehicles.newTitle")}</span>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/customers/${id}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {customer.firstName} {customer.lastName}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("vehicles.newTitle")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("vehicles.newSubtitle", {
            customer: `${customer.firstName} ${customer.lastName}`,
          })}
        </p>
      </div>

      <VehicleForm customerId={id} />
    </div>
  );
}
