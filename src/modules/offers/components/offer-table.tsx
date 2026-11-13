"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, FileText, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OfferStatusBadge } from "./offer-status-badge";
import { formatCurrency } from "../lib/calculations";
import type { OfferListItem } from "../types";

interface OfferTableProps {
  offers: OfferListItem[];
  locale: string;
  groupByCustomer?: boolean;
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("sl-SI");
}

function customerLabel(
  c: { firstName: string; lastName: string; companyName: string | null }
) {
  return c.companyName || `${c.firstName} ${c.lastName}`;
}

export function OfferTable({ offers, locale, groupByCustomer }: OfferTableProps) {
  const t = useTranslations("offers");
  const tc = useTranslations("common");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (offers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
        {t("noOffers")}
      </div>
    );
  }


  return (
    <>
    {/* ── Phone: tappable cards ── */}
    <div className="space-y-2 md:hidden">
      {offers.map((offer, i) => {
        const customerKey = customerLabel(offer.customer);
        const showGroupHeader = groupByCustomer && (i === 0 || customerLabel(offers[i - 1].customer) !== customerKey);
        const isCollapsed = groupByCustomer && collapsed.has(customerKey);

        return (
          <Fragment key={offer.id}>
            {showGroupHeader && (
              <button
                type="button"
                onClick={() => toggleGroup(customerKey)}
                className="flex w-full items-center gap-2 px-1 pt-2 text-left text-sm font-semibold"
              >
                {isCollapsed
                  ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                {customerKey}
              </button>
            )}
            {!isCollapsed && (
              <Link
                href={`/${locale}/offers/${offer.id}`}
                className="block rounded-lg border bg-card p-3 transition-colors active:bg-muted/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-medium text-primary">{offer.offerNumber}</span>
                  <OfferStatusBadge status={offer.status} />
                </div>
                {!groupByCustomer && (
                  <p className="mt-1.5 truncate text-sm font-medium">{customerKey}</p>
                )}
                {offer.vehicle && (
                  <p className="truncate text-sm text-muted-foreground">
                    {offer.vehicle.registrationPlate && (
                      <span className="mr-1.5 font-mono text-foreground">{offer.vehicle.registrationPlate}</span>
                    )}
                    {offer.vehicle.make} {offer.vehicle.model}
                  </p>
                )}
                <div className="mt-1.5 flex items-end justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(offer.createdAt)} · {t("items.count", { count: offer.itemCount })}
                  </span>
                  <span className="text-base font-semibold tabular-nums">
                    {formatCurrency(offer.grandTotal, offer.currency)}
                  </span>
                </div>
              </Link>
            )}
          </Fragment>
        );
      })}
    </div>

    {/* ── Desktop: table ── */}
    <div className="hidden overflow-hidden rounded-lg border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("fields.offerNumber")}</TableHead>
            <TableHead>{t("fields.status")}</TableHead>
            {!groupByCustomer && <TableHead>{t("fields.customer")}</TableHead>}
            <TableHead className="hidden md:table-cell">{t("fields.vehicle")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("fields.date")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("fields.validUntil")}</TableHead>
            <TableHead className="text-right">{t("fields.total")}</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer, i) => {
            const customerKey = customerLabel(offer.customer);
            const showGroupHeader = groupByCustomer && (i === 0 || customerLabel(offers[i - 1].customer) !== customerKey);

            const isCollapsed = groupByCustomer && collapsed.has(customerKey);
            const colSpan = groupByCustomer ? 7 : 8;

            return (
              <Fragment key={offer.id}>
                {showGroupHeader && (
                  <TableRow
                    className="bg-muted/40 hover:bg-muted/60 cursor-pointer select-none"
                    onClick={() => toggleGroup(customerKey)}
                  >
                    <TableCell colSpan={colSpan} className="py-2">
                      <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                        {isCollapsed
                          ? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        }
                        {customerKey}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!isCollapsed && (
                  <TableRow>
                    <TableCell className="font-mono text-sm font-medium">
                      <Link
                        href={`/${locale}/offers/${offer.id}`}
                        className="hover:underline text-primary"
                      >
                        {offer.offerNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <OfferStatusBadge status={offer.status} />
                    </TableCell>
                    {!groupByCustomer && (
                      <TableCell>{customerKey}</TableCell>
                    )}
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {offer.vehicle
                        ? `${offer.vehicle.registrationPlate ? `${offer.vehicle.registrationPlate} · ` : ""}${offer.vehicle.make} ${offer.vehicle.model} (${offer.vehicle.year})`
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{formatDate(offer.createdAt)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {offer.validUntil ? formatDate(offer.validUntil) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(offer.grandTotal, offer.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" title={tc("view")}>
                          <Link href={`/${locale}/offers/${offer.id}`}>
                            <FileText className="h-4 w-4" />
                          </Link>
                        </Button>
                        {offer.status === "DRAFT" && (
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8" title={tc("edit")}>
                            <Link href={`/${locale}/offers/${offer.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
    </>
  );
}
