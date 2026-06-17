import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Pencil, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OfferStatusBadge } from "@/modules/offers/components/offer-status-badge";
import { OfferStatusTimeline } from "@/modules/offers/components/offer-status-timeline";
import { StatusActions } from "@/modules/offers/components/status-actions";
import { DeleteOfferButton } from "@/modules/offers/components/delete-offer-button";
import { getOffer } from "@/modules/offers/actions/get-offer";
import { calcItem, calcTotals, formatCurrency } from "@/modules/offers/lib/calculations";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const offer = await getOffer(id);
  return { title: offer ? `Offer ${offer.offerNumber}` : "Offer" };
}

interface OfferDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sl-SI");
}

export default async function OfferDetailPage({ params }: OfferDetailPageProps) {
  const { locale, id } = await params;
  const [offer, session, t, tUnits] = await Promise.all([
    getOffer(id),
    auth(),
    getTranslations("offers"),
    getTranslations("products.units"),
  ]);

  if (!offer) notFound();

  const isAdmin = session?.user?.role === "ADMIN";
  const totals = calcTotals(offer.items);
  const customerName = offer.customer.companyName
    ? offer.customer.companyName
    : `${offer.customer.firstName} ${offer.customer.lastName}`;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight font-mono">
              {offer.offerNumber}
            </h1>
            <OfferStatusBadge status={offer.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(offer.createdAt)}
            {offer.validUntil
              ? ` · ${t("detail.validUntil")} ${formatDate(offer.validUntil)}`
              : ""}
            {offer.createdBy
              ? ` · ${t("detail.createdBy")} ${offer.createdBy.name ?? "—"}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm">
            <a
              href={`/api/offers/${offer.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              {t("actions.downloadPdf")}
            </a>
          </Button>

          {offer.status === "DRAFT" && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/${locale}/offers/${offer.id}/edit`}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
              {isAdmin && (
                <DeleteOfferButton
                  offerId={offer.id}
                  offerNumber={offer.offerNumber}
                  locale={locale}
                />
              )}
            </>
          )}

          <StatusActions offerId={offer.id} status={offer.status} />
        </div>
      </div>

      <Separator />

      {/* Status timeline */}
      <OfferStatusTimeline
        status={offer.status}
        labels={{
          DRAFT: t("statuses.DRAFT"),
          SENT: t("statuses.SENT"),
          APPROVED: t("statuses.APPROVED"),
          REJECTED: t("statuses.REJECTED"),
          COMPLETED: t("statuses.COMPLETED"),
        }}
      />

      {/* Customer + Vehicle */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("fields.customer")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{customerName}</p>
            {offer.customer.companyName && (
              <p className="text-muted-foreground">
                {offer.customer.firstName} {offer.customer.lastName}
              </p>
            )}
            {offer.customer.taxNumber && (
              <p className="text-muted-foreground">VAT: {offer.customer.taxNumber}</p>
            )}
            {offer.customer.address && (
              <p className="text-muted-foreground">{offer.customer.address}</p>
            )}
            {(offer.customer.city || offer.customer.postalCode) && (
              <p className="text-muted-foreground">
                {[offer.customer.postalCode, offer.customer.city].filter(Boolean).join(" ")}
              </p>
            )}
            {offer.customer.email && (
              <p className="text-muted-foreground">{offer.customer.email}</p>
            )}
            {offer.customer.phone && (
              <p className="text-muted-foreground">{offer.customer.phone}</p>
            )}
            <div className="pt-1">
              <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                <Link href={`/${locale}/customers/${offer.customerId}`}>
                  {t("detail.viewCustomer")} →
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("fields.vehicle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {offer.vehicle ? (
              <div className="space-y-1">
                <p className="font-semibold">
                  {offer.vehicle.make} {offer.vehicle.model} ({offer.vehicle.year})
                </p>
                {offer.vehicle.registrationPlate && (
                  <p className="text-muted-foreground">
                    Reg: {offer.vehicle.registrationPlate}
                  </p>
                )}
                {offer.vehicle.vin && (
                  <p className="font-mono text-xs text-muted-foreground">
                    VIN: {offer.vehicle.vin}
                  </p>
                )}
                {offer.mileage != null && (
                  <p className="text-muted-foreground">
                    {t("fields.mileage")}: {offer.mileage.toLocaleString()} km
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">{t("detail.noVehicle")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("items.title")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 w-8">#</TableHead>
                  <TableHead className="w-[140px]">{t("items.productNumber")}</TableHead>
                  <TableHead>{t("items.description")}</TableHead>
                  <TableHead className="text-right">{t("items.quantity")}</TableHead>
                  <TableHead className="text-center">{t("items.unit")}</TableHead>
                  <TableHead className="text-right">{t("items.pricePerUnit")}</TableHead>
                  <TableHead className="text-right">{t("items.vatRate")}</TableHead>
                  <TableHead className="text-right">{t("items.discount")}</TableHead>
                  <TableHead className="text-right pr-6">{t("items.lineTotal")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offer.items.map((item, idx) => {
                  const calc = calcItem(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6 text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.productNumber ?? "—"}
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">
                        {Number(item.quantity).toFixed(2).replace(/\.00$/, "")}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {tUnits.has(item.unit) ? tUnits(item.unit as never) : item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(item.pricePerUnit), offer.currency)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.vatRate}%
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {Number(item.discount) > 0 ? `${item.discount}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium pr-6">
                        {formatCurrency(calc.lineTotal, offer.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end border-t p-6">
            <div className="w-56 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("totals.subtotal")}</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(totals.subtotalExVat, offer.currency)}
                </span>
              </div>
              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("totals.discount")}</span>
                  <span className="text-emerald-600">−{formatCurrency(totals.totalDiscount, offer.currency)}</span>
                </div>
              )}
              {totals.vatBreakdown.map(({ rate, amount }) => (
                <div key={rate} className="flex justify-between text-muted-foreground">
                  <span>{t("totals.vat", { rate })}</span>
                  <span>{formatCurrency(amount, offer.currency)}</span>
                </div>
              ))}
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold text-base">
                <span>{t("totals.grandTotal")}</span>
                <span>{formatCurrency(totals.grandTotal, offer.currency)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {offer.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("fields.notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{offer.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
