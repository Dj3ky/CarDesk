import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSettings } from "@/modules/settings/actions/get-settings";

const BASE_URL = "https://auto-parts-catalog.apiprofile.com";
const LOCALE_TO_LANG: Record<string, number> = { en: 4, sl: 36 };
const DEFAULT_LANG = 4;

type CrossRefItem = {
  articleId: number;
  supplierId: number;
  crossNumber: string;
  articleNumberRoot: string;
  crossManufacturerName: string;
  articleBrandRoot: string;
  searchLevel: string;
};

type FullArticle = {
  articleId: number;
  articleNo: string;
  articleSearchNo?: string;
  articleProductName?: string;
  supplierName?: string;
  supplierId?: number;
  articleMediaType?: string;
  articleMediaFileName?: string;
  s3image?: string;
};

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

  // Step 1: fetch cross-refs for each article
  const results = await Promise.all(
    articleIds.map(async (articleId) => {
      const supplierParam = [...supplierSet].map((sid) => `supplierId=${sid}`).join("&");
      const url = `${BASE_URL}/api/artlookup/search-for-cross-references-through-oem-numbers-by-article-id?articleId=${articleId}&langId=${langId}${supplierParam ? `&${supplierParam}` : ""}`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      const items: CrossRefItem[] = Array.isArray(data) ? data : (data.articles ?? []);
      return items.filter(
        (a) =>
          a.searchLevel === "IAM -> OEM -> IAM -> IAM" &&
          a.crossNumber !== a.articleNumberRoot &&
          a.crossManufacturerName === a.articleBrandRoot
      );
    })
  );

  // Step 2: collect unique cross-ref numbers (excluding root article numbers)
  const rootNumbers = new Set(results.flat().map((a) => a.articleNumberRoot));
  const seenNumbers = new Set<string>(rootNumbers);
  const crossNums: { crossNumber: string; supplierId: number }[] = [];

  for (const batch of results) {
    for (const item of batch) {
      if (seenNumbers.has(item.crossNumber)) continue;
      seenNumbers.add(item.crossNumber);
      crossNums.push({ crossNumber: item.crossNumber, supplierId: item.supplierId });
    }
  }

  if (crossNums.length === 0) return NextResponse.json({ articles: [] });

  // Step 3: enrich each cross-ref with full article data
  const enriched = await Promise.all(
    crossNums.map(async ({ crossNumber, supplierId }) => {
      const url = `${BASE_URL}/api/artlookup/search-articles-by-article-no?articleNo=${encodeURIComponent(crossNumber)}&articleType=ArticleNumber&langId=${langId}`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      const articles: FullArticle[] = Array.isArray(data) ? data : (data.articles ?? []);
      return (
        articles.find((a) => a.supplierId === supplierId) ??
        articles.find((a) => a.articleNo === crossNumber) ??
        articles[0] ??
        null
      );
    })
  );

  return NextResponse.json({ articles: enriched.filter(Boolean) });
}
