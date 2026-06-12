import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/modules/products/components/product-form";
import { getProduct } from "@/modules/products/actions/get-product";

interface EditProductPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: EditProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Not found" };
  return { title: `${product.productNumber} — ${product.description}` };
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations();
  const product = await getProduct(id);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/products`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("products.title")}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("products.editTitle")}</h1>
        <p className="text-muted-foreground text-sm mt-1 font-mono">
          {product.productNumber} — {product.description}
        </p>
      </div>

      <ProductForm product={product} />
    </div>
  );
}
