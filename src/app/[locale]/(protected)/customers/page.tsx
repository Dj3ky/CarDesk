import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerTable } from "@/modules/customers/components/customer-table";
import { CustomerSearch } from "@/modules/customers/components/customer-search";
import { Pagination } from "@/modules/customers/components/pagination";
import { getCustomers } from "@/modules/customers/actions/get-customers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("customers");
  return { title: t("title") };
}

interface CustomersPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function CustomersPage({ params, searchParams }: CustomersPageProps) {
  const { locale } = await params;
  const { search, page: pageParam } = await searchParams;

  const t = await getTranslations();
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { customers, total, totalPages } = await getCustomers({ page, search });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("customers.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("customers.subtitle", { count: total })}
          </p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/customers/new`}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t("customers.addNew")}
          </Link>
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Suspense>
          <CustomerSearch defaultValue={search ?? ""} />
        </Suspense>
      </div>

      {/* Table */}
      <CustomerTable customers={customers} locale={locale} />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath={`/${locale}/customers`}
          searchParams={{ search }}
        />
      )}
    </div>
  );
}
