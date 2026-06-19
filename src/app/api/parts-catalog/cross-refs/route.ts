import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSettings } from "@/modules/settings/actions/get-settings";

const BASE_URL = "https://auto-parts-catalog.apiprofile.com";
const LOCALE_TO_LANG: Record<string, number> = { en: 4, sl: 36 };
const DEFAULT_LANG = 4;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getSettings();
  if (!settings.partsCatalogApiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { articleIds, supplierIds, locale } = body as {
    articleIds?: number[];
    supplierIds?: number[];
    locale?: string;
  };
  if (!articleIds?.length) return NextResponse.json({ error: "articleIds required" }, { status: 400 });

  const langId = LOCALE_TO_LANG[locale ?? ""] ?? DEFAULT_LANG;
  const headers = { "x-apiprofile-key": settings.partsCatalogApiKey, Accept: "application/json" };
  const supplierSet = new Set(supplierIds ?? []);

  const results = await Promise.all(
    articleIds.map(async (articleId) => {
      const url = `${BASE_URL}/api/artlookup/search-for-cross-references-through-oem-numbers-by-article-id?articleId=${articleId}&langId=${langId}`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        console.log(`[cross-refs] ${articleId} status=${res.status}`);
        return [];
      }
      const data = await res.json();
      console.log(`[cross-refs] ${articleId} raw:`, JSON.stringify(data).slice(0, 800));
      const items: {
        articleId: number;
        supplierId: number;
        crossNumber: string;
        crossManufacturerName: string;
        articleBrandRoot: string;
        searchLevel: string;
        articleMediaType?: string;
        articleMediaFileName?: string;
        s3image?: string;
      }[] = Array.isArray(data) ? data : (data.articles ?? []);
      return items.filter(
        (a) =>
          a.searchLevel === "IAM -> OEM -> IAM -> IAM" &&
          (supplierSet.size === 0 || supplierSet.has(a.supplierId))
      );
    })
  );

  const seen = new Set<number>(articleIds);
  const merged: unknown[] = [];
  for (const batch of results) {
    for (const item of batch) {
      if (seen.has(item.articleId)) continue;
      seen.add(item.articleId);
      merged.push({
        articleId: item.articleId,
        articleNo: item.crossNumber,
        supplierName: item.crossManufacturerName,
        supplierId: item.supplierId,
        articleMediaType: item.articleMediaType,
        articleMediaFileName: item.articleMediaFileName,
        s3image: item.s3image,
      });
    }
  }

  return NextResponse.json({ articles: merged });
}
