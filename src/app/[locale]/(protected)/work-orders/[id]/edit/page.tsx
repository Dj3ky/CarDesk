import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { getWorkOrder } from "@/modules/work-orders/actions/get-work-order";
import { getCustomersForWorkOrder, getTechnicians } from "@/modules/work-orders/actions/get-form-data";
import { getSettings } from "@/modules/settings/actions/get-settings";
import { WorkOrderForm } from "@/modules/work-orders/components/work-order-form";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const wo = await getWorkOrder(id);
  return { title: wo ? `Edit ${wo.number}` : "Edit Work Order" };
}

const EDITABLE_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_PARTS"];

interface EditWorkOrderPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditWorkOrderPage({ params }: EditWorkOrderPageProps) {
  const { locale, id } = await params;
  const [session, wo] = await Promise.all([auth(), getWorkOrder(id)]);

  if (!canAccess(session?.user ?? { role: "", permissions: [] }, "work_orders")) {
    redirect(`/${locale}/dashboard`);
  }
  if (!wo) notFound();

  if (!EDITABLE_STATUSES.includes(wo.status)) {
    redirect(`/${locale}/work-orders/${id}`);
  }

  const [customers, technicians, settings] = await Promise.all([
    getCustomersForWorkOrder(),
    getTechnicians(),
    getSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/work-orders/${id}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {wo.number}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Work Order</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">{wo.number}</p>
      </div>

      <WorkOrderForm
        workOrder={wo}
        customers={customers}
        technicians={technicians}
        defaultVATRate={parseFloat(settings.defaultVATRate.toString())}
        currency={settings.currency}
      />
    </div>
  );
}
