import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { FilePlus2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/modules/customers/components/pagination";
import { OfferTable } from "@/modules/offers/components/offer-table";
import { getOffers } from "@/modules/offers/actions/get-offers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("offers");
  return { title: t("title") };
}

const STATUSES: { value: string; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "COMPLETED", label: "Completed" },
];

interface OffersPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}

export default async function OffersPage({ params, searchParams }: OffersPageProps) {
  const { locale } = await params;
  const session = await auth();
  if (!canAccess(session?.user ?? { role: "", permissions: [] }, "offers")) {
    redirect(`/${locale}/dashboard`);
  }

  const sp = await searchParams;
  const t = await getTranslations("offers");

  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const status = sp.status ?? "ALL";

  const { offers, total, totalPages } = await getOffers({
    page,
    status,
    search: sp.search,
  });

  const basePath = `/${locale}/offers`;

  function statusHref(s: string) {
    const params = new URLSearchParams();
    if (s !== "ALL") params.set("status", s);
    if (sp.search) params.set("search", sp.search);
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {total} {total === 1 ? "offer" : "offers"}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`${basePath}/new`}>
            <FilePlus2 className="mr-2 h-4 w-4" />
            {t("addNew")}
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

      <Suspense>
        <OfferTable offers={offers} locale={locale} />
      </Suspense>

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
