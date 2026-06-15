import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { WorkOrderForm } from "@/modules/work-orders/components/work-order-form";
import { getCustomersForWorkOrder, getTechnicians } from "@/modules/work-orders/actions/get-form-data";
import { getSettings } from "@/modules/settings/actions/get-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "New Work Order" };
}

interface NewWorkOrderPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ customerId?: string }>;
}

export default async function NewWorkOrderPage({ params, searchParams }: NewWorkOrderPageProps) {
  const { locale } = await params;
  const session = await auth();
  if (!canAccess(session?.user ?? { role: "", permissions: [] }, "work_orders")) {
    redirect(`/${locale}/dashboard`);
  }

  const { customerId } = await searchParams;

  const [customers, technicians, settings] = await Promise.all([
    getCustomersForWorkOrder(),
    getTechnicians(),
    getSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/work-orders`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Work Orders
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Work Order</h1>
        <p className="text-sm text-muted-foreground mt-1">Record a new service job</p>
      </div>

      <WorkOrderForm
        customers={customers}
        technicians={technicians}
        defaultVATRate={parseFloat(settings.defaultVATRate.toString())}
        currency={settings.currency}
        defaultCustomerId={typeof customerId === "string" ? customerId : undefined}
      />
    </div>
  );
}
