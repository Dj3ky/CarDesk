import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleForm } from "@/modules/vehicles/components/vehicle-form";
import { getVehicle } from "@/modules/vehicles/actions/get-vehicle";

interface EditVehiclePageProps {
  params: Promise<{ locale: string; id: string; vehicleId: string }>;
}

export async function generateMetadata({ params }: EditVehiclePageProps): Promise<Metadata> {
  const { vehicleId } = await params;
  const vehicle = await getVehicle(vehicleId);
  if (!vehicle) return { title: "Not found" };
  const t = await getTranslations("vehicles");
  return { title: `${t("editTitle")} — ${vehicle.make} ${vehicle.model}` };
}

export default async function EditVehiclePage({ params }: EditVehiclePageProps) {
  const { locale, id, vehicleId } = await params;
  const t = await getTranslations();
  const vehicle = await getVehicle(vehicleId);

  if (!vehicle || vehicle.customerId !== id) notFound();

  const vehicleName = `${vehicle.make} ${vehicle.model} (${vehicle.year})`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${locale}/customers`} className="hover:text-foreground">
          {t("customers.title")}
        </Link>
        <span>/</span>
        <Link href={`/${locale}/customers/${id}`} className="hover:text-foreground">
          {vehicle.customer.firstName} {vehicle.customer.lastName}
        </Link>
        <span>/</span>
        <Link
          href={`/${locale}/customers/${id}/vehicles/${vehicleId}`}
          className="hover:text-foreground"
        >
          {vehicleName}
        </Link>
        <span>/</span>
        <span className="text-foreground">{t("common.edit")}</span>
      </div>

      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/customers/${id}/vehicles/${vehicleId}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {vehicleName}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("vehicles.editTitle")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{vehicleName}</p>
      </div>

      <VehicleForm customerId={id} vehicle={vehicle} />
    </div>
  );
}
