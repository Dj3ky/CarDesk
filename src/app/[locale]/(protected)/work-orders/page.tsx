import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Wrench, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { WorkOrderTable } from "@/modules/work-orders/components/work-order-table";
import { getWorkOrders } from "@/modules/work-orders/actions/get-work-orders";
import { Pagination } from "@/modules/customers/components/pagination";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("workOrders");
  return { title: t("title") };
}

const STATUS_KEYS = ["ALL", "OPEN", "IN_PROGRESS", "WAITING_PARTS", "DONE", "INVOICED", "CANCELLED"] as const;

interface WorkOrdersPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}

export default async function WorkOrdersPage({ params, searchParams }: WorkOrdersPageProps) {
  const { locale } = await params;
  const session = await auth();
  if (!canAccess(session?.user ?? { role: "", permissions: [] }, "work_orders")) {
    redirect(`/${locale}/dashboard`);
  }

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const status = sp.status ?? "ALL";

  const [t, { workOrders, total, totalPages }] = await Promise.all([
    getTranslations("workOrders"),
    getWorkOrders({ page, status, search: sp.search }),
  ]);

  const basePath = `/${locale}/work-orders`;

  function statusHref(s: string) {
    const p = new URLSearchParams();
    if (s !== "ALL") p.set("status", s);
    if (sp.search) p.set("search", sp.search);
    const qs = p.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("subtitle", { count: total })}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`${basePath}/new`}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("actions.newWorkOrder")}
          </Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1">
        {STATUS_KEYS.map((key) => (
          <Link
            key={key}
            href={statusHref(key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              status === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t(`statuses.${key}`)}
          </Link>
        ))}
      </div>

      <WorkOrderTable workOrders={workOrders} />

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath={basePath}
          searchParams={{ status: status !== "ALL" ? status : undefined }}
        />
      )}
    </div>
  );
}
