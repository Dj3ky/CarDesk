"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { Calendar, Wrench } from "lucide-react";
import { WorkOrderStatusBadge } from "./work-order-status-badge";
import type { WorkOrderListItem } from "../types";

interface WorkOrderTableProps {
  workOrders: WorkOrderListItem[];
}

export function WorkOrderTable({ workOrders }: WorkOrderTableProps) {
  const locale = useLocale();

  if (workOrders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
        No work orders found.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Number</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Vehicle</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Technician</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {workOrders.map((wo) => (
            <tr key={wo.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <Link
                  href={`/${locale}/work-orders/${wo.id}`}
                  className="font-mono text-sm font-medium text-primary hover:underline"
                >
                  {wo.number}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className="font-medium">
                  {wo.customer.companyName ?? `${wo.customer.firstName} ${wo.customer.lastName}`}
                </span>
              </td>
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
                    ? new Date(wo.scheduledAt).toLocaleDateString("sl-SI")
                    : new Date(wo.createdAt).toLocaleDateString("sl-SI")}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WorkOrderTableSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center gap-2 p-4 text-muted-foreground text-sm">
        <Wrench className="h-4 w-4 animate-pulse" />
        Loading work orders...
      </div>
    </div>
  );
}
