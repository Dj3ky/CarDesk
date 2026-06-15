import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/modules/customers/components/customer-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("customers");
  return { title: t("newTitle") };
}

interface NewCustomerPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewCustomerPage({ params }: NewCustomerPageProps) {
  const { locale } = await params;
  const session = await auth();
  if (!canAccess(session?.user ?? { role: "", permissions: [] }, "customers")) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/customers`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("customers.title")}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("customers.newTitle")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("customers.newSubtitle")}</p>
      </div>

      <CustomerForm />
    </div>
  );
}
