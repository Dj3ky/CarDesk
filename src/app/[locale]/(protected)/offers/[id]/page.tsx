import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { ChevronLeft, Mail, Phone } from "lucide-react";
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
import { OfferActions } from "@/modules/offers/components/offer-actions";
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

function formatQty(q: string | number) {
  return Number(q).toFixed(2).replace(/\.00$/, "");
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
  const unitLabel = (u: string) => (tUnits.has(u) ? tUnits(u as never) : u);

  return (
    // pb-24 on phones leaves room for the fixed action bar
    <div className="max-w-6xl space-y-6 pb-24 md:pb-0">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/${locale}/offers`}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("title")}
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight">
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
          <p className="text-lg font-semibold md:hidden">
            {formatCurrency(totals.grandTotal, offer.currency)}
          </p>
        </div>

        <OfferActions
          offerId={offer.id}
          offerNumber={offer.offerNumber}
          status={offer.status}
          locale={locale}
          isAdmin={isAdmin}
        />
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
            {(offer.customer.phone || offer.customer.email) && (
              <div className="flex flex-wrap gap-2 pt-2">
                {offer.customer.phone && (
                  <Button asChild variant="outline" size="sm" className="h-10 sm:h-8">
                    <a href={`tel:${offer.customer.phone.replace(/[^\d+]/g, "")}`}>
                      <Phone className="mr-1.5 h-3.5 w-3.5" />
                      {offer.customer.phone}
                    </a>
                  </Button>
                )}
                {offer.customer.email && (
                  <Button asChild variant="outline" size="sm" className="h-10 max-w-full sm:h-8">
                    <a href={`mailto:${offer.customer.email}?subject=${encodeURIComponent(offer.offerNumber)}`}>
                      <Mail className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{offer.customer.email}</span>
                    </a>
                  </Button>
                )}
              </div>
            )}
            <div className="pt-2">
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
                    Reg: <span className="font-mono">{offer.vehicle.registrationPlate}</span>
                  </p>
                )}
                {offer.vehicle.vin && (
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    VIN: {offer.vehicle.vin}
                  </p>
                )}
                {offer.mileage != null && (
                  <p className="text-muted-foreground">
                    {t("fields.mileage")}: {offer.mileage.toLocaleString("sl-SI")} km
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
          {/* Phone: compact list */}
          <ul className="divide-y border-t md:hidden">
            {offer.items.map((item) => {
              const calc = calcItem(item);
              const disc = Number(item.discount);
              return (
                <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.description}</p>
                    {item.productNumber && (
                      <p className="font-mono text-xs text-muted-foreground">{item.productNumber}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatQty(item.quantity)} {unitLabel(item.unit)} ×{" "}
                      {formatCurrency(Number(item.pricePerUnit), offer.currency)}
                      {disc > 0 && <span className="text-emerald-600"> −{disc}%</span>}
                      {" · "}
                      {t("items.vatRate")} {item.vatRate}%
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatCurrency(calc.lineTotal, offer.currency)}
                  </p>
                </li>
              );
            })}
          </ul>

          {/* Desktop: full table */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 pl-6">#</TableHead>
                  <TableHead className="w-[140px]">{t("items.productNumber")}</TableHead>
                  <TableHead>{t("items.description")}</TableHead>
                  <TableHead className="text-right">{t("items.quantity")}</TableHead>
                  <TableHead className="text-center">{t("items.unit")}</TableHead>
                  <TableHead className="text-right">{t("items.pricePerUnit")}</TableHead>
                  <TableHead className="text-right">{t("items.vatRate")}</TableHead>
                  <TableHead className="text-right">{t("items.discount")}</TableHead>
                  <TableHead className="pr-6 text-right">{t("items.lineTotal")}</TableHead>
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
                      <TableCell className="text-right">{formatQty(item.quantity)}</TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {unitLabel(item.unit)}
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
                      <TableCell className="pr-6 text-right font-medium">
                        {formatCurrency(calc.lineTotal, offer.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end border-t p-4 md:p-6">
            <div className="w-full space-y-1.5 text-sm sm:w-56">
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
              <div className="flex justify-between text-base font-semibold">
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
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{offer.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
