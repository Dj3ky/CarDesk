import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Pencil, Calendar, Car, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { getWorkOrder } from "@/modules/work-orders/actions/get-work-order";
import { WorkOrderStatusBadge } from "@/modules/work-orders/components/work-order-status-badge";
import { StatusActions } from "@/modules/work-orders/components/status-actions";
import { DeleteWorkOrderButton } from "@/modules/work-orders/components/delete-work-order-button";
import { calcTotals, formatCurrency } from "@/modules/work-orders/lib/calculations";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const wo = await getWorkOrder(id);
  return { title: wo ? `Work Order ${wo.number}` : "Work Order" };
}

interface WorkOrderPageProps {
  params: Promise<{ locale: string; id: string }>;
}

const EDITABLE_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_PARTS"];

export default async function WorkOrderPage({ params }: WorkOrderPageProps) {
  const { locale, id } = await params;
  const [session, wo] = await Promise.all([auth(), getWorkOrder(id)]);

  if (!canAccess(session?.user ?? { role: "", permissions: [] }, "work_orders")) {
    redirect(`/${locale}/dashboard`);
  }
  if (!wo) notFound();

  const totals = calcTotals(wo.items, wo.laborItems);
  const canEdit = EDITABLE_STATUSES.includes(wo.status);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/work-orders`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Work Orders
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight font-mono">{wo.number}</h1>
            <WorkOrderStatusBadge status={wo.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {new Date(wo.createdAt).toLocaleDateString("sl-SI")}
            {wo.createdBy && ` by ${wo.createdBy.name ?? "unknown"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/work-orders/${wo.id}/edit`}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
          )}
          {wo.status !== "INVOICED" && (
            <DeleteWorkOrderButton workOrderId={wo.id} workOrderNumber={wo.number} />
          )}
        </div>
      </div>

      {/* Status actions */}
      <StatusActions workOrderId={wo.id} status={wo.status} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Vehicle */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Customer & Vehicle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <Link href={`/${locale}/customers/${wo.customerId}`} className="font-medium hover:underline text-primary">
                    {wo.customer.companyName ?? `${wo.customer.firstName} ${wo.customer.lastName}`}
                  </Link>
                  {wo.customer.email && <p className="text-sm text-muted-foreground">{wo.customer.email}</p>}
                  {wo.customer.phone && <p className="text-sm text-muted-foreground">{wo.customer.phone}</p>}
                </div>
              </div>
              {wo.vehicle && (
                <div className="flex items-start gap-2">
                  <Car className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{wo.vehicle.make} {wo.vehicle.model} {wo.vehicle.year}</p>
                    {wo.vehicle.registrationPlate && (
                      <p className="text-sm font-mono text-muted-foreground">{wo.vehicle.registrationPlate}</p>
                    )}
                    {wo.vehicle.vin && (
                      <p className="text-xs text-muted-foreground">VIN: {wo.vehicle.vin}</p>
                    )}
                    {wo.mileageIn && (
                      <p className="text-sm text-muted-foreground">Mileage in: {wo.mileageIn.toLocaleString()} km{wo.mileageOut ? ` · out: ${wo.mileageOut.toLocaleString()} km` : ""}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reported problem */}
          {wo.reportedProblem && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Reported Problem</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{wo.reportedProblem}</p>
              </CardContent>
            </Card>
          )}

          {/* Parts */}
          {wo.items.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Parts / Materials</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {wo.items.map((item) => {
                        const { lineTotal } = calcTotals([item], []);
                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-2.5">
                              {item.productNumber && <span className="font-mono text-xs text-muted-foreground mr-1">{item.productNumber}</span>}
                              {item.description}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{parseFloat(item.quantity)} {item.unit}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(parseFloat(item.pricePerUnit))}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatCurrency(lineTotal.grandTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Labor */}
          {wo.laborItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Labor</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Hours</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Rate</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {wo.laborItems.map((labor) => {
                        const { lineTotal } = calcTotals([], [labor]);
                        return (
                          <tr key={labor.id}>
                            <td className="px-4 py-2.5">{labor.description}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{parseFloat(labor.hours)} h</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(parseFloat(labor.hourlyRate))}/h</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatCurrency(lineTotal.grandTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Internal notes */}
          {wo.internalNotes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{wo.internalNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — summary */}
        <div className="space-y-4">
          {/* Meta */}
          <Card>
            <CardContent className="pt-4 space-y-3 text-sm">
              {wo.technician && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Technician: <span className="text-foreground font-medium">{wo.technician.name ?? wo.technician.email}</span></span>
                </div>
              )}
              {wo.scheduledAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Scheduled: <span className="text-foreground">{new Date(wo.scheduledAt).toLocaleDateString("sl-SI")}</span></span>
                </div>
              )}
              {wo.completedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Completed: <span className="text-foreground">{new Date(wo.completedAt).toLocaleDateString("sl-SI")}</span></span>
                </div>
              )}
              {wo.offerId && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <Link href={`/${locale}/offers/${wo.offerId}`} className="text-primary hover:underline">
                    Linked offer
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          {(wo.items.length > 0 || wo.laborItems.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {totals.partsSubtotalExVat > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Parts (ex VAT)</span>
                    <span>{formatCurrency(totals.partsSubtotalExVat)}</span>
                  </div>
                )}
                {totals.laborSubtotalExVat > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Labor (ex VAT)</span>
                    <span>{formatCurrency(totals.laborSubtotalExVat)}</span>
                  </div>
                )}
                {totals.vatBreakdown.map(({ rate, amount }) => (
                  <div key={rate} className="flex justify-between text-muted-foreground">
                    <span>VAT {rate}%</span>
                    <span>{formatCurrency(amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-base border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(totals.grandTotal)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
