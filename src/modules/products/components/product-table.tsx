import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Pencil, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteProductDialog } from "./delete-product-dialog";
import { SubstitutionPartCell } from "./substitution-part-cell";
import { priceExVat, priceIncVat, formatEur } from "../lib/price";
import type { ProductListItem } from "../types";

interface ProductTableProps {
  products: ProductListItem[];
  locale: string;
  showActions?: boolean;
  isAdmin?: boolean;
}

export async function ProductTable({
  products,
  locale,
  showActions = false,
  isAdmin = false,
}: ProductTableProps) {
  const t = await getTranslations();

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-muted-foreground text-sm">{t("products.noResults")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">{t("products.fields.productNumber")}</TableHead>
            <TableHead>{t("products.fields.description")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("products.fields.brand")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("products.fields.supplier")}</TableHead>
            <TableHead className="hidden xl:table-cell w-[130px]">{t("products.fields.substitutionPart")}</TableHead>
            <TableHead className="text-right w-[110px]">{t("products.fields.priceExVat")}</TableHead>
            <TableHead className="hidden sm:table-cell text-right w-[60px]">
              {t("products.fields.vatRate")}
            </TableHead>
            <TableHead className="text-right w-[120px]">{t("products.fields.priceIncVat")}</TableHead>
            <TableHead className="hidden md:table-cell text-right w-[80px]">
              {t("products.fields.stock")}
            </TableHead>
            {showActions && (
              <TableHead className="w-[90px] text-right">{t("common.actions")}</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => {
            const exVat = priceExVat(p.price);
            const incVat = priceIncVat(p.price, p.vatRate);
            const adjExVat = p.adjustedPrice ? priceExVat(p.adjustedPrice) : undefined;
            const adjIncVat = p.adjustedPrice ? priceIncVat(p.adjustedPrice, p.vatRate) : undefined;
            const vatPct = parseFloat(p.vatRate);
            const lowStock = p.stock <= 0;

            return (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-medium">{p.productNumber}</span>
                    {p.substitutionPart && (
                      <span title={`${t("products.fields.substitutionPart")}: ${p.substitutionPart}`}>
                        <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      </span>
                    )}
                  </div>
                  {p.barcode && (
                    <div className="text-xs text-muted-foreground font-mono">{p.barcode}</div>
                  )}
                  {p.substitutionPart && (
                    <div className="text-xs font-mono text-amber-600 dark:text-amber-400 xl:hidden">
                      → {p.substitutionPart}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{p.description}</div>
                  {!p.isActive && (
                    <Badge variant="secondary" className="mt-0.5 text-xs">
                      {t("common.inactive")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {p.brand ?? "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {p.supplier ?? "—"}
                </TableCell>
                <TableCell className="hidden xl:table-cell text-sm">
                  <SubstitutionPartCell substitutionPart={p.substitutionPart} />
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {adjExVat !== undefined ? (
                    <>
                      <div className="font-medium">{formatEur(adjExVat)}</div>
                      <div className="text-xs text-muted-foreground line-through">{formatEur(exVat)}</div>
                    </>
                  ) : (
                    formatEur(exVat)
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-right text-sm text-muted-foreground">
                  {vatPct}%
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium text-sm">
                  {adjIncVat !== undefined ? (
                    <>
                      <div>{formatEur(adjIncVat)}</div>
                      <div className="text-xs text-muted-foreground font-normal line-through">{formatEur(incVat)}</div>
                    </>
                  ) : (
                    formatEur(incVat)
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell text-right text-sm">
                  <span className={lowStock ? "text-destructive font-medium" : ""}>
                    {p.stock} {p.unit}
                  </span>
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/${locale}/products/${p.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Link>
                      </Button>
                      {isAdmin && (
                        <DeleteProductDialog
                          productId={p.id}
                          productName={`${p.productNumber} — ${p.description}`}
                        />
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
