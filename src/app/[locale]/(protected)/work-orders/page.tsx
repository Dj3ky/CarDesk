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
  return { title: "Work Orders" };
}

const STATUSES = [
  { value: "ALL",           label: "All" },
  { value: "OPEN",          label: "Open" },
  { value: "IN_PROGRESS",   label: "In Progress" },
  { value: "WAITING_PARTS", label: "Waiting Parts" },
  { value: "DONE",          label: "Done" },
  { value: "INVOICED",      label: "Invoiced" },
  { value: "CANCELLED",     label: "Cancelled" },
];

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

  const { workOrders, total, totalPages } = await getWorkOrders({ page, status, search: sp.search });

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
            <h1 className="text-2xl font-bold tracking-tight">Work Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {total} {total === 1 ? "work order" : "work orders"}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`${basePath}/new`}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Work Order
          </Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1">
        {STATUSES.map(({ value, label }) => (
          <Link
            key={value}
            href={statusHref(value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              status === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
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
