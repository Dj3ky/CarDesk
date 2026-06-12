import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/modules/products/components/product-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("products");
  return { title: t("newTitle") };
}

interface NewProductPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewProductPage({ params }: NewProductPageProps) {
  const { locale } = await params;
  const t = await getTranslations();

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
        <h1 className="text-2xl font-bold tracking-tight">{t("products.newTitle")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("products.newSubtitle")}</p>
      </div>

      <ProductForm />
    </div>
  );
}
