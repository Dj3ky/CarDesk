"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { WorkOrderStatusBadge } from "./work-order-status-badge";
import type { WorkOrderListItem } from "../types";

interface WorkOrderTableProps {
  workOrders: WorkOrderListItem[];
  groupByCustomer?: boolean;
}

function customerLabel(c: { firstName: string; lastName: string; companyName: string | null }) {
  return c.companyName ?? `${c.firstName} ${c.lastName}`;
}

export function WorkOrderTable({ workOrders, groupByCustomer }: WorkOrderTableProps) {
  const locale = useLocale();
  const t = useTranslations("workOrders");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (workOrders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
        {t("noWorkOrders")}
      </div>
    );
  }

  let lastCustomerKey = "";

  // columns: number, [customer], vehicle, technician, status, date = 6 or 5 when grouped
  const colSpan = groupByCustomer ? 5 : 6;

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("fields.number")}</th>
            {!groupByCustomer && (
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("fields.customer")}</th>
            )}
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">{t("fields.vehicle")}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">{t("fields.technician")}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("fields.status")}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">{t("fields.date")}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {workOrders.map((wo) => {
            const key = customerLabel(wo.customer);
            const showHeader = groupByCustomer && key !== lastCustomerKey;
            if (groupByCustomer) lastCustomerKey = key;
            const isCollapsed = groupByCustomer && collapsed.has(key);

            return (
              <Fragment key={wo.id}>
                {showHeader && (
                  <tr
                    className="bg-muted/40 hover:bg-muted/60 cursor-pointer select-none"
                    onClick={() => toggleGroup(key)}
                  >
                    <td colSpan={colSpan} className="px-4 py-2">
                      <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                        {isCollapsed
                          ? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        }
                        {key}
                      </div>
                    </td>
                  </tr>
                )}
                {!isCollapsed && (
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/${locale}/work-orders/${wo.id}`}
                        className="font-mono text-sm font-medium text-primary hover:underline"
                      >
                        {wo.number}
                      </Link>
                    </td>
                    {!groupByCustomer && (
                      <td className="px-4 py-3 font-medium">{key}</td>
                    )}
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {wo.vehicle
                        ? `${wo.vehicle.make} ${wo.vehicle.model}${wo.vehicle.registrationPlate ? ` · ${wo.vehicle.registrationPlate}` : ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {wo.technician?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <WorkOrderStatusBadge status={wo.status} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {wo.scheduledAt
                          ? new Date(wo.scheduledAt).toLocaleDateString(locale)
                          : new Date(wo.createdAt).toLocaleDateString(locale)}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function WorkOrderTableSkeleton() {
  const t = useTranslations("workOrders");
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center gap-2 p-4 text-muted-foreground text-sm">
        <Wrench className="h-4 w-4 animate-pulse" />
        {t("loading")}
      </div>
    </div>
  );
}
