import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Car, FileText, TrendingUp, UserPlus, ArrowRight } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const t = await getTranslations();
  const session = await auth();
  const locale = await getLocale();

  const [totalCustomers, activeCustomers] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { isActive: true } }),
  ]);

  const stats = [
    {
      title: t("dashboard.totalCustomers"),
      value: totalCustomers.toString(),
      icon: Users,
      description: t("dashboard.activeCustomers") + `: ${activeCustomers}`,
      href: `/${locale}/customers`,
    },
    {
      title: "Vehicles",
      value: "—",
      icon: Car,
      description: "Coming in Phase 3",
      href: null,
    },
    {
      title: "Quotations",
      value: "—",
      icon: FileText,
      description: "Coming in Phase 4",
      href: null,
    },
    {
      title: "Revenue (MTD)",
      value: "—",
      icon: TrendingUp,
      description: "Coming in Phase 5",
      href: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">
            {t("dashboard.welcome", { name: session?.user?.name ?? "User" })}
          </p>
        </div>
        {session?.user?.role && (
          <Badge variant="outline" className="capitalize text-sm px-3 py-1">
            {t(`common.${session.user.role.toLowerCase() as "admin" | "employee"}`)}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className={stat.href ? "cursor-pointer hover:bg-muted/30 transition-colors" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              {stat.href && (
                <Link
                  href={stat.href}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild size="sm">
            <Link href={`/${locale}/customers/new`}>
              <UserPlus className="mr-2 h-4 w-4" />
              New Customer
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
