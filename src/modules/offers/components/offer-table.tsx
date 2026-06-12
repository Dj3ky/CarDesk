"use client";

import Link from "next/link";
import { FileText, Pencil } from "lucide-react";
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
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("sl-SI");
}

function customerLabel(
  c: { firstName: string; lastName: string; companyName: string | null }
) {
  return c.companyName || `${c.firstName} ${c.lastName}`;
}

export function OfferTable({ offers, locale }: OfferTableProps) {
  if (offers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
        No offers found.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Offer No.</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Valid Until</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => (
            <TableRow key={offer.id}>
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
              <TableCell>{customerLabel(offer.customer)}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {offer.vehicle
                  ? `${offer.vehicle.make} ${offer.vehicle.model} (${offer.vehicle.year})`
                  : "—"}
              </TableCell>
              <TableCell className="text-sm">{formatDate(offer.createdAt)}</TableCell>
              <TableCell className="text-sm">
                {offer.validUntil ? formatDate(offer.validUntil) : "—"}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(offer.grandTotal, offer.currency)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 justify-end">
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                    <Link href={`/${locale}/offers/${offer.id}`}>
                      <FileText className="h-4 w-4" />
                    </Link>
                  </Button>
                  {offer.status === "DRAFT" && (
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <Link href={`/${locale}/offers/${offer.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
