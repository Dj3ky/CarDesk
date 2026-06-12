import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Car, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleCard } from "./vehicle-card";
import { getVehiclesByCustomer } from "../actions/get-vehicles";

interface VehicleListProps {
  customerId: string;
  locale: string;
}

export async function VehicleList({ customerId, locale }: VehicleListProps) {
  const t = await getTranslations();
  const vehicles = await getVehiclesByCustomer(customerId);

  return (
    <div className="space-y-3">
      {vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
          <Car className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{t("vehicles.noVehicles")}</p>
          <Button asChild size="sm" variant="outline" className="mt-4">
            <Link href={`/${locale}/customers/${customerId}/vehicles/new`}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              {t("vehicles.addFirst")}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} locale={locale} />
            ))}
          </div>
          <div className="pt-1">
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href={`/${locale}/customers/${customerId}/vehicles/new`}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                {t("vehicles.addVehicle")}
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
