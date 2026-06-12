import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Tag } from "lucide-react";
import { ProductTable } from "@/modules/products/components/product-table";
import { ProductSearchBar } from "@/modules/products/components/product-search-bar";
import { ProductFilters } from "@/modules/products/components/product-filters";
import { Pagination } from "@/modules/customers/components/pagination";
import { getProducts } from "@/modules/products/actions/get-products";
import { getFilterOptions } from "@/modules/products/actions/get-filter-options";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("products");
  return { title: t("pricelistTitle") };
}

interface PricelistPageProps {
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

export default async function PricelistPage({ params, searchParams }: PricelistPageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations();

  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [{ products, total, totalPages }, filterOptions] = await Promise.all([
    getProducts({
      page,
      pageSize: "pricelist",
      search: sp.search,
      brand: sp.brand,
      supplier: sp.supplier,
      minPrice: sp.minPrice ? parseFloat(sp.minPrice) : undefined,
      maxPrice: sp.maxPrice ? parseFloat(sp.maxPrice) : undefined,
      showInactive: false, // pricelist always hides inactive
    }),
    getFilterOptions(),
  ]);

  const basePath = `/${locale}/pricelist`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Tag className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("products.pricelistTitle")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("products.subtitle", { count: total })}
          </p>
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

      {/* Read-only table — no actions */}
      <ProductTable products={products} locale={locale} showActions={false} />

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
