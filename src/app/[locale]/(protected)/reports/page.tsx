import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart2, TrendingUp, Users, Package, ArrowRight } from "lucide-react";
import { calcTotals, formatCurrency } from "@/modules/offers/lib/calculations";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports");
  return { title: t("title") };
}

type Period = "week" | "month" | "quarter" | "year";

const PERIOD_DAYS: Record<Period, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

interface ReportsPageProps {
  searchParams: Promise<{ period?: string }>;
}

function periodStart(period: Period): Date {
  const d = new Date();
  d.setDate(d.getDate() - PERIOD_DAYS[period]);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const [t, locale, session] = await Promise.all([getTranslations("reports"), getLocale(), auth()]);
  if (!canAccess(session?.user ?? { role: "", permissions: [] }, "reports")) {
    redirect(`/${locale}/dashboard`);
  }

  const { period: periodParam } = await searchParams;
  const period: Period =
    periodParam === "week" || periodParam === "quarter" || periodParam === "year"
      ? periodParam
      : "month";

  const since = periodStart(period);
  const slowMovingSince = periodStart("quarter");

  const settings = await prisma.settings.findFirst({ select: { currency: true } });
  const currency = settings?.currency ?? "EUR";

  // Revenue over period (APPROVED + COMPLETED offers)
  const [revenueItems, topCustomersRaw, topProductsRaw, conversionRaw, slowStockRaw] =
    await Promise.all([
      // Revenue items
      prisma.offerItem.findMany({
        where: {
          offer: {
            status: { in: ["APPROVED", "COMPLETED"] },
            createdAt: { gte: since },
          },
        },
        select: { quantity: true, pricePerUnit: true, vatRate: true, discount: true },
      }),

      // Top customers by revenue
      prisma.$queryRaw<
        { customerId: string; firstName: string; lastName: string; companyName: string | null; total: number }[]
      >`
        SELECT
          c.id AS "customerId",
          c."firstName",
          c."lastName",
          c."companyName",
          SUM(
            oi.quantity * oi."pricePerUnit"
            * (1 - oi.discount / 100)
            * (1 + oi."vatRate" / 100)
          ) AS total
        FROM "Offer" o
        JOIN "Customer" c ON c.id = o."customerId"
        JOIN "OfferItem" oi ON oi."offerId" = o.id
        WHERE o.status IN ('APPROVED','COMPLETED')
          AND o."createdAt" >= ${since}
        GROUP BY c.id, c."firstName", c."lastName", c."companyName"
        ORDER BY total DESC
        LIMIT 10
      `,

      // Top products by revenue
      prisma.$queryRaw<
        { productId: string | null; description: string; productNumber: string | null; total: number; qty: number }[]
      >`
        SELECT
          oi."productId",
          oi.description,
          oi."productNumber",
          SUM(
            oi.quantity * oi."pricePerUnit"
            * (1 - oi.discount / 100)
            * (1 + oi."vatRate" / 100)
          ) AS total,
          SUM(oi.quantity) AS qty
        FROM "Offer" o
        JOIN "OfferItem" oi ON oi."offerId" = o.id
        WHERE o.status IN ('APPROVED','COMPLETED')
          AND o."createdAt" >= ${since}
        GROUP BY oi."productId", oi.description, oi."productNumber"
        ORDER BY total DESC
        LIMIT 10
      `,

      // Offer conversion: SENT offers vs those that became APPROVED/COMPLETED
      prisma.$queryRaw<{ sent: number; approved: number }[]>`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('SENT','APPROVED','COMPLETED','REJECTED')) AS sent,
          COUNT(*) FILTER (WHERE status IN ('APPROVED','COMPLETED')) AS approved
        FROM "Offer"
        WHERE "createdAt" >= ${since}
      `,

      // Slow-moving stock: active products with no offer items in last 90 days
      prisma.$queryRaw<
        { id: string; productNumber: string; description: string; stock: number }[]
      >`
        SELECT p.id, p."productNumber", p.description, p.stock
        FROM "Product" p
        WHERE p."isActive" = true
          AND p.stock > 0
          AND NOT EXISTS (
            SELECT 1
            FROM "OfferItem" oi
            JOIN "Offer" o ON o.id = oi."offerId"
            WHERE oi."productId" = p.id
              AND o."createdAt" >= ${slowMovingSince}
          )
        ORDER BY p.stock DESC
        LIMIT 20
      `,
    ]);

  const revenue = calcTotals(
    revenueItems.map((i) => ({
      quantity: Number(i.quantity),
      pricePerUnit: Number(i.pricePerUnit),
      vatRate: Number(i.vatRate),
      discount: Number(i.discount),
    }))
  );

  const conv = conversionRaw[0] ?? { sent: 0, approved: 0 };
  const sentCount = Number(conv.sent);
  const approvedCount = Number(conv.approved);
  const conversionRate = sentCount > 0 ? Math.round((approvedCount / sentCount) * 100) : null;

  const periods: { key: Period; label: string }[] = [
    { key: "week", label: t("periods.week") },
    { key: "month", label: t("periods.month") },
    { key: "quarter", label: t("periods.quarter") },
    { key: "year", label: t("periods.year") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BarChart2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
          {periods.map((p) => (
            <Link
              key={p.key}
              href={`?period=${p.key}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("kpi.revenue")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(revenue.grandTotal, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("kpi.revenueDesc", { period: t(`periods.${period}`) })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("kpi.conversion")}
            </CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {conversionRate !== null ? `${conversionRate}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("kpi.conversionDesc", { approved: approvedCount, sent: sentCount })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("kpi.netRevenue")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(revenue.subtotalExVat, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("kpi.netRevenueDesc")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              {t("topCustomers.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topCustomersRaw.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">{t("noData")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">#</TableHead>
                    <TableHead>{t("topCustomers.customer")}</TableHead>
                    <TableHead className="text-right pr-6">{t("topCustomers.revenue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomersRaw.map((row, i) => (
                    <TableRow key={row.customerId}>
                      <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <Link
                          href={`/${locale}/customers/${row.customerId}`}
                          className="hover:underline text-sm"
                        >
                          {row.companyName ?? `${row.firstName} ${row.lastName}`}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-medium pr-6">
                        {formatCurrency(Number(row.total), currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              {t("topProducts.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topProductsRaw.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">{t("noData")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">#</TableHead>
                    <TableHead>{t("topProducts.product")}</TableHead>
                    <TableHead className="text-right">{t("topProducts.qty")}</TableHead>
                    <TableHead className="text-right pr-6">{t("topProducts.revenue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProductsRaw.map((row, i) => (
                    <TableRow key={`${row.productId ?? row.description}-${i}`}>
                      <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        {row.productId ? (
                          <Link
                            href={`/${locale}/products/${row.productId}/edit`}
                            className="hover:underline text-sm"
                          >
                            <span className="font-mono text-xs text-muted-foreground block">
                              {row.productNumber}
                            </span>
                            {row.description}
                          </Link>
                        ) : (
                          <span className="text-sm">{row.description}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {Number(row.qty).toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right font-medium pr-6">
                        {formatCurrency(Number(row.total), currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slow-moving stock */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-amber-500" />
            {t("slowStock.title")}
            <Badge variant="outline" className="ml-1 text-xs font-normal">
              {t("slowStock.badge")}
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("slowStock.desc")}</p>
        </CardHeader>
        <CardContent className="p-0">
          {slowStockRaw.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">{t("slowStock.none")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">{t("slowStock.colNumber")}</TableHead>
                    <TableHead>{t("slowStock.colDescription")}</TableHead>
                    <TableHead className="text-right pr-6">{t("slowStock.colStock")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowStockRaw.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                        <Link
                          href={`/${locale}/products/${p.id}/edit`}
                          className="hover:underline"
                        >
                          {p.productNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{p.description}</TableCell>
                      <TableCell className="text-right font-medium pr-6">
                        {Number(p.stock)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="px-6 pb-4 pt-2">
            <Link
              href={`/${locale}/products`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {t("slowStock.viewAll")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
