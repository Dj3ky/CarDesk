import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Car,
  Package,
  FileText,
  TrendingUp,
  UserPlus,
  FilePlus,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";
import { OfferStatusBadge } from "@/modules/offers/components/offer-status-badge";
import { calcTotals, formatCurrency } from "@/modules/offers/lib/calculations";
import type { OfferStatus } from "@/modules/offers/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const [t, session, locale] = await Promise.all([
    getTranslations(),
    auth(),
    getLocale(),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalCustomers,
    activeCustomers,
    activeVehicles,
    activeProducts,
    offersByStatus,
    recentOffers,
    mtdOfferItems,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { isActive: true } }),
    prisma.vehicle.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.offer.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.offer.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { firstName: true, lastName: true, companyName: true } },
        items: {
          select: { quantity: true, pricePerUnit: true, vatRate: true, discount: true },
        },
      },
    }),
    prisma.offerItem.findMany({
      where: {
        offer: {
          status: { in: ["APPROVED", "COMPLETED"] },
          createdAt: { gte: startOfMonth },
        },
      },
      select: { quantity: true, pricePerUnit: true, vatRate: true, discount: true },
    }),
  ]);

  const statusMap = Object.fromEntries(
    offersByStatus.map((r) => [r.status, r._count._all])
  ) as Record<string, number>;

  const pendingCount = (statusMap["SENT"] ?? 0) + (statusMap["APPROVED"] ?? 0);
  const mtdTotals = calcTotals(
    mtdOfferItems.map((i) => ({
      quantity: i.quantity.toNumber(),
      pricePerUnit: i.pricePerUnit.toNumber(),
      vatRate: i.vatRate.toNumber(),
      discount: i.discount.toNumber(),
    }))
  );
  const settings = await prisma.settings.findFirst({ select: { currency: true } });
  const currency = settings?.currency ?? "EUR";

  const stats = [
    {
      title: t("dashboard.totalCustomers"),
      value: totalCustomers,
      desc: t("dashboard.activeCustomers", { count: activeCustomers }),
      icon: Users,
      href: `/${locale}/customers`,
    },
    {
      title: t("dashboard.activeVehicles"),
      value: activeVehicles,
      desc: t("dashboard.activeVehiclesDesc"),
      icon: Car,
      href: `/${locale}/customers`,
    },
    {
      title: t("dashboard.activeProducts"),
      value: activeProducts,
      desc: t("dashboard.activeProductsDesc"),
      icon: Package,
      href: `/${locale}/products`,
    },
    {
      title: t("dashboard.pendingOffers"),
      value: pendingCount,
      desc: t("dashboard.pendingOffersDesc"),
      icon: FileText,
      href: `/${locale}/offers`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.welcome", { name: session?.user?.name ?? "—" })}
            </p>
          </div>
        </div>
        {session?.user?.role && (
          <Badge variant="outline" className="capitalize">
            {t(`common.${session.user.role.toLowerCase() as "admin" | "employee"}`)}
          </Badge>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:bg-muted/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
              <Link
                href={stat.href}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
              >
                {t("dashboard.viewAll")} <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue MTD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("dashboard.revenueMTD")}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {formatCurrency(mtdTotals.grandTotal, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t("dashboard.revenueMTDDesc")}</p>
          <div className="flex gap-6 mt-3 text-sm">
            {Object.entries(statusMap).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5">
                <OfferStatusBadge status={status as OfferStatus} />
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent offers */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{t("dashboard.recentOffers")}</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href={`/${locale}/offers`}>
                {t("dashboard.viewAll")} <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentOffers.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                {t("dashboard.noRecentOffers")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("offers.fields.offerNumber")}</TableHead>
                    <TableHead>{t("offers.fields.customer")}</TableHead>
                    <TableHead>{t("offers.fields.status")}</TableHead>
                    <TableHead className="text-right">{t("offers.fields.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOffers.map((offer) => {
                    const customerName = offer.customer.companyName
                      ? offer.customer.companyName
                      : `${offer.customer.firstName} ${offer.customer.lastName}`;
                    const total = calcTotals(
                      offer.items.map((i) => ({
                        quantity: i.quantity.toNumber(),
                        pricePerUnit: i.pricePerUnit.toNumber(),
                        vatRate: i.vatRate.toNumber(),
                        discount: i.discount.toNumber(),
                      }))
                    ).grandTotal;
                    return (
                      <TableRow key={offer.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Link
                            href={`/${locale}/offers/${offer.id}`}
                            className="font-mono text-sm font-medium hover:underline"
                          >
                            {offer.offerNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{customerName}</TableCell>
                        <TableCell>
                          <OfferStatusBadge status={offer.status as OfferStatus} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(total, offer.currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("dashboard.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href={`/${locale}/offers/new`}>
                <FilePlus className="mr-2 h-4 w-4" />
                {t("dashboard.newOffer")}
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href={`/${locale}/customers/new`}>
                <UserPlus className="mr-2 h-4 w-4" />
                {t("dashboard.newCustomer")}
              </Link>
            </Button>
            <Separator className="my-2" />
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href={`/${locale}/products`}>
                <Package className="mr-2 h-4 w-4" />
                {t("nav.products")}
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href={`/${locale}/offers`}>
                <FileText className="mr-2 h-4 w-4" />
                {t("nav.offers")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
