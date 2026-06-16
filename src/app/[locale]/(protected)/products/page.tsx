import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/permissions";
import { Package, PackagePlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductTable } from "@/modules/products/components/product-table";
import { ProductSearchBar } from "@/modules/products/components/product-search-bar";
import { ProductFilters } from "@/modules/products/components/product-filters";
import { Pagination } from "@/modules/customers/components/pagination";
import { getProducts } from "@/modules/products/actions/get-products";
import { getFilterOptions } from "@/modules/products/actions/get-filter-options";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("products");
  return { title: t("title") };
}

interface ProductsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    search?: string;
    page?: string;
    brand?: string;
    supplier?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { locale } = await params;
  const session = await auth();
  if (!canAccess(session?.user ?? { role: "", permissions: [] }, "products")) {
    redirect(`/${locale}/dashboard`);
  }

  const sp = await searchParams;
  const t = await getTranslations();
  const isAdmin = session?.user?.role === "ADMIN";

  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [{ products, total, totalPages }, filterOptions] = await Promise.all([
    getProducts({
      page,
      search: sp.search,
      brand: sp.brand,
      supplier: sp.supplier,
      minPrice: sp.minPrice ? parseFloat(sp.minPrice) : undefined,
      maxPrice: sp.maxPrice ? parseFloat(sp.maxPrice) : undefined,
      showInactive: isAdmin,
    }),
    getFilterOptions(),
  ]);

  const basePath = `/${locale}/products`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("products.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("products.subtitle", { count: total })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button asChild variant="outline">
              <Link href={`/${locale}/products/import`}>
                <Upload className="mr-2 h-4 w-4" />
                {t("import.button")}
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/${locale}/products/new`}>
              <PackagePlus className="mr-2 h-4 w-4" />
              {t("products.addNew")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <Suspense>
          <ProductSearchBar defaultValue={sp.search ?? ""} />
        </Suspense>
        <Suspense>
          <ProductFilters
            options={filterOptions}
            current={{
              brand: sp.brand,
              supplier: sp.supplier,
              minPrice: sp.minPrice,
              maxPrice: sp.maxPrice,
            }}
          />
        </Suspense>
      </div>

      {/* Table */}
      <ProductTable
        products={products}
        locale={locale}
        showActions
        isAdmin={isAdmin}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath={basePath}
          searchParams={{
            search: sp.search,
            brand: sp.brand,
            supplier: sp.supplier,
            minPrice: sp.minPrice,
            maxPrice: sp.maxPrice,
          }}
        />
      )}
    </div>
  );
}
