import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkOrderStatusBadge } from "@/modules/work-orders/components/work-order-status-badge";
import {
  ChevronLeft,
  Pencil,
  Hash,
  Fuel,
  Gauge,
  CalendarDays,
  Palette,
  FileText,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteVehicleDialog } from "@/modules/vehicles/components/delete-vehicle-dialog";
import { getVehicle } from "@/modules/vehicles/actions/get-vehicle";
import type { FuelType } from "@/modules/vehicles/types";

interface VehicleDetailPageProps {
  params: Promise<{ locale: string; id: string; vehicleId: string }>;
}

export async function generateMetadata({ params }: VehicleDetailPageProps): Promise<Metadata> {
  const { vehicleId } = await params;
  const vehicle = await getVehicle(vehicleId);
  if (!vehicle) return { title: "Not found" };
  return { title: `${vehicle.make} ${vehicle.model} (${vehicle.year})` };
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const { locale, id, vehicleId } = await params;
  const t = await getTranslations();
  const [session, vehicle, vehicleWorkOrders] = await Promise.all([
    auth(),
    getVehicle(vehicleId),
    prisma.workOrder.findMany({
      where: { vehicleId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        number: true,
        status: true,
        createdAt: true,
        completedAt: true,
        technician: { select: { name: true } },
        reportedProblem: true,
      },
    }),
  ]);

  if (!vehicle || vehicle.customerId !== id) notFound();

  const vehicleName = `${vehicle.make} ${vehicle.model} (${vehicle.year})`;
  const fuelKey = vehicle.fuelType.toLowerCase() as Lowercase<FuelType>;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${locale}/customers`} className="hover:text-foreground">
          {t("customers.title")}
        </Link>
        <span>/</span>
        <Link href={`/${locale}/customers/${id}`} className="hover:text-foreground">
          {vehicle.customer.firstName} {vehicle.customer.lastName}
        </Link>
        <span>/</span>
        <span className="text-foreground">{vehicleName}</span>
      </div>

      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/customers/${id}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {vehicle.customer.firstName} {vehicle.customer.lastName}
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{vehicleName}</h1>
            {!vehicle.isActive && (
              <Badge variant="secondary">{t("common.inactive")}</Badge>
            )}
          </div>
          {vehicle.registrationPlate && (
            <Badge variant="outline" className="font-mono text-sm tracking-widest">
              {vehicle.registrationPlate}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/customers/${id}/vehicles/${vehicleId}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              {t("common.edit")}
            </Link>
          </Button>
          {session?.user?.role === "ADMIN" && (
            <DeleteVehicleDialog
              vehicleId={vehicleId}
              customerId={id}
              vehicleName={vehicleName}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Specifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("vehicles.sections.specs")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow icon={<Fuel className="h-4 w-4" />} label={t("vehicles.fields.fuelType")}>
              {t(`vehicles.fuelTypes.${fuelKey}`)}
            </DetailRow>
            <DetailRow icon={<Gauge className="h-4 w-4" />} label={t("vehicles.fields.mileage")}>
              {vehicle.mileage !== null && vehicle.mileage !== undefined
                ? `${vehicle.mileage.toLocaleString()} km`
                : <span className="text-muted-foreground">—</span>}
            </DetailRow>
            <DetailRow icon={<Palette className="h-4 w-4" />} label={t("vehicles.fields.color")}>
              {vehicle.color ?? <span className="text-muted-foreground">—</span>}
            </DetailRow>
          </CardContent>
        </Card>

        {/* Registration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("vehicles.sections.registration")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow
              icon={<Hash className="h-4 w-4" />}
              label={t("vehicles.fields.registrationPlate")}
            >
              {vehicle.registrationPlate ? (
                <span className="font-mono tracking-wider">{vehicle.registrationPlate}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </DetailRow>
            <DetailRow icon={<Hash className="h-4 w-4" />} label={t("vehicles.fields.vin")}>
              {vehicle.vin ? (
                <span className="font-mono text-xs tracking-wider">{vehicle.vin}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </DetailRow>
          </CardContent>
        </Card>

        {/* Notes */}
        {vehicle.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t("vehicles.sections.notes")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vehicle.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Work Order History */}
        {vehicleWorkOrders.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">{t("workOrders.serviceHistory.title")}</CardTitle>
              <Link
                href={`/${locale}/work-orders/new?customerId=${id}`}
                className="text-xs text-primary hover:underline"
              >
                {t("workOrders.serviceHistory.newWorkOrder")}
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t("workOrders.serviceHistory.colNumber")}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t("workOrders.serviceHistory.colStatus")}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">{t("workOrders.serviceHistory.colProblem")}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">{t("workOrders.serviceHistory.colTechnician")}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t("workOrders.serviceHistory.colDate")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vehicleWorkOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <Link href={`/${locale}/work-orders/${wo.id}`} className="font-mono text-primary hover:underline text-xs">
                          {wo.number}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <WorkOrderStatusBadge status={wo.status as import("@/modules/work-orders/types").WorkOrderStatus} />
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground max-w-xs truncate">
                        {wo.reportedProblem ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">
                        {wo.technician?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {new Date(wo.createdAt).toLocaleDateString(locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Meta */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("customers.sections.meta")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
            <DetailRow
              icon={<CalendarDays className="h-4 w-4" />}
              label={t("customers.fields.createdAt")}
            >
              {new Date(vehicle.createdAt).toLocaleDateString(locale, {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </DetailRow>
            <DetailRow
              icon={<CalendarDays className="h-4 w-4" />}
              label={t("customers.fields.updatedAt")}
            >
              {new Date(vehicle.updatedAt).toLocaleDateString(locale, {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </DetailRow>
            {vehicle.createdBy && (
              <DetailRow
                icon={<User className="h-4 w-4" />}
                label={t("customers.fields.createdBy")}
              >
                {vehicle.createdBy.name ?? vehicle.createdBy.email}
              </DetailRow>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
          {label}
        </div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
