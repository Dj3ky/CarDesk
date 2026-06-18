import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Eye, Building2, Phone } from "lucide-react";
import type { CustomerListItem } from "../types";

interface CustomerTableProps {
  customers: CustomerListItem[];
  locale: string;
}

export async function CustomerTable({ customers, locale }: CustomerTableProps) {
  const t = await getTranslations();

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-muted-foreground text-sm">{t("customers.noResults")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("customers.fields.name")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("customers.fields.contact")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("customers.fields.company")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("customers.fields.city")}</TableHead>
            <TableHead>{t("common.status")}</TableHead>
            <TableHead className="w-[100px] text-right">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>
                <Link
                  href={`/${locale}/customers/${customer.id}`}
                  className="font-medium hover:underline"
                >
                  {customer.lastName}, {customer.firstName}
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="space-y-0.5 text-sm">
                  {customer.email && (
                    <div className="text-muted-foreground truncate max-w-[200px]">
                      {customer.email}
                    </div>
                  )}
                  {(customer.phone || customer.mobile) && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {customer.phone || customer.mobile}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {customer.companyName && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    {customer.companyName}
                  </div>
                )}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                {customer.city}
              </TableCell>
              <TableCell>
                <Badge variant={customer.isActive ? "default" : "secondary"}>
                  {customer.isActive ? t("common.active") : t("common.inactive")}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" asChild title={t("common.view")}>
                    <Link href={`/${locale}/customers/${customer.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild title={t("common.edit")}>
                    <Link href={`/${locale}/customers/${customer.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
