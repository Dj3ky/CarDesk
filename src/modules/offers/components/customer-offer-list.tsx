import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FileText, Plus } from "lucide-react";
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
import { getOffers } from "../actions/get-offers";

interface CustomerOfferListProps {
  customerId: string;
  locale: string;
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("sl-SI");
}

export async function CustomerOfferList({ customerId, locale }: CustomerOfferListProps) {
  const t = await getTranslations();
  const { offers } = await getOffers({ customerId });

  if (offers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">{t("offers.noOffers")}</p>
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link href={`/${locale}/offers/new?customerId=${customerId}`}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            {t("offers.addFirst")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("offers.fields.offerNumber")}</TableHead>
            <TableHead>{t("offers.fields.status")}</TableHead>
            <TableHead>{t("offers.fields.vehicle")}</TableHead>
            <TableHead>{t("offers.fields.date")}</TableHead>
            <TableHead>{t("offers.fields.validUntil")}</TableHead>
            <TableHead className="text-right">{t("offers.fields.total")}</TableHead>
            <TableHead className="w-[50px]" />
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
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                  <Link href={`/${locale}/offers/${offer.id}`}>
                    <FileText className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
