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

  const results = await Promise.all(
    articleIds.map(async (articleId) => {
      const supplierParam = [...supplierSet].map((sid) => `supplierId=${sid}`).join("&");
      const url = `${BASE_URL}/api/artlookup/search-for-cross-references-through-oem-numbers-by-article-id?articleId=${articleId}&langId=${langId}${supplierParam ? `&${supplierParam}` : ""}`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      const items: CrossRefItem[] = Array.isArray(data) ? data : (data.articles ?? []);
      return items.filter((a) => {
        if (a.searchLevel !== "IAM -> OEM -> IAM -> IAM") return false;
        if (a.crossNumber === a.articleNumberRoot) return false;
        const n1 = a.crossManufacturerName.toLowerCase();
        const n2 = a.articleBrandRoot.toLowerCase();
        return n1.includes(n2) || n2.includes(n1);
      });
    })
  );

  const seenNumbers = new Set<string>();
  const merged: unknown[] = [];
  for (const batch of results) {
    for (const item of batch) {
      if (seenNumbers.has(item.crossNumber)) continue;
      seenNumbers.add(item.crossNumber);
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
