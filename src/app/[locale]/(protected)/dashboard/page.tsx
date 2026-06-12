import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Car, FileText, TrendingUp } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const t = await getTranslations();
  const session = await auth();

  const stats = [
    { title: "Total Vehicles", value: "—", icon: Car, description: "Coming in Phase 2" },
    { title: "Active Clients", value: "—", icon: Users, description: "Coming in Phase 2" },
    { title: "Open Inquiries", value: "—", icon: FileText, description: "Coming in Phase 2" },
    { title: "Revenue (MTD)", value: "—", icon: TrendingUp, description: "Coming in Phase 2" },
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
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phase 1 — Foundation Complete</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Next.js 15 App Router
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> PostgreSQL + Prisma ORM
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Auth.js v5 with role-based access (Admin / Employee)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> next-intl i18n (English + Croatian)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> shadcn/ui + Tailwind CSS v4
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Protected routes middleware
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> PWA manifest
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Docker + Docker Compose
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
