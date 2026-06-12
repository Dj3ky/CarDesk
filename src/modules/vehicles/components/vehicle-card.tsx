import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Fuel, Gauge, Palette, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VehicleListItem, FuelType } from "../types";

interface VehicleCardProps {
  vehicle: VehicleListItem;
  locale: string;
}

export async function VehicleCard({ vehicle, locale }: VehicleCardProps) {
  const t = await getTranslations();
  const href = `/${locale}/customers/${vehicle.customerId}/vehicles/${vehicle.id}`;
  const fuelKey = vehicle.fuelType.toLowerCase() as Lowercase<FuelType>;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4 hover:bg-muted/30 transition-colors">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">
            {vehicle.make} {vehicle.model}
          </span>
          <span className="text-muted-foreground text-sm">({vehicle.year})</span>
          {vehicle.registrationPlate && (
            <Badge variant="outline" className="font-mono text-xs tracking-wider">
              {vehicle.registrationPlate}
            </Badge>
          )}
          {!vehicle.isActive && (
            <Badge variant="secondary">{t("common.inactive")}</Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Fuel className="h-3 w-3" />
            {t(`vehicles.fuelTypes.${fuelKey}`)}
          </span>
          {vehicle.mileage !== null && vehicle.mileage !== undefined && (
            <span className="flex items-center gap-1">
              <Gauge className="h-3 w-3" />
              {vehicle.mileage.toLocaleString()} km
            </span>
          )}
          {vehicle.color && (
            <span className="flex items-center gap-1">
              <Palette className="h-3 w-3" />
              {vehicle.color}
            </span>
          )}
        </div>
      </div>
      <Button variant="ghost" size="sm" asChild className="shrink-0">
        <Link href={href}>
          {t("common.view")}
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
