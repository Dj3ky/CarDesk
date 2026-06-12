import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/modules/customers/components/customer-form";
import { getCustomer } from "@/modules/customers/actions/get-customer";

interface EditCustomerPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: EditCustomerPageProps): Promise<Metadata> {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) return { title: "Not found" };
  const t = await getTranslations("customers");
  return { title: `${t("editTitle")} — ${customer.firstName} ${customer.lastName}` };
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations();
  const customer = await getCustomer(id);

  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/customers/${id}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {customer.firstName} {customer.lastName}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("customers.editTitle")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {customer.firstName} {customer.lastName}
        </p>
      </div>

      <CustomerForm customer={customer} />
    </div>
  );
}
