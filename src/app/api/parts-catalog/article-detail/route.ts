import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSettings } from "@/modules/settings/actions/get-settings";

const BASE_URL = "https://auto-parts-catalog.apiprofile.com";
const LOCALE_TO_LANG: Record<string, number> = { en: 4, sl: 36 };
const DEFAULT_LANG = 4;
const COUNTRY_FILTER_ID = 63;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getSettings();
  if (!settings.partsCatalogApiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { articleId, locale } = body as { articleId?: number; locale?: string };
  if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });

  const langId = LOCALE_TO_LANG[locale ?? ""] ?? DEFAULT_LANG;
  const headers = { "x-apiprofile-key": settings.partsCatalogApiKey, Accept: "application/json" };

  const detailUrl = `${BASE_URL}/api/articles/details/article-id/${articleId}/lang-id/${langId}`;
  const criteriaUrl = `${BASE_URL}/api/articles/selection-of-all-specifications-criterias-for-the-article/article-id/${articleId}/lang-id/${langId}/country-filter-id/${COUNTRY_FILTER_ID}`;
  const criteriaUrl0 = `${BASE_URL}/api/articles/selection-of-all-specifications-criterias-for-the-article/article-id/${articleId}/lang-id/${langId}/country-filter-id/0`;
  const partsUrl = `${BASE_URL}/api/articles/list-of-parts-for-article/article-id/${articleId}/lang-id/${langId}/country-filter-id/${COUNTRY_FILTER_ID}`;
  const partsUrl0 = `${BASE_URL}/api/articles/list-of-parts-for-article/article-id/${articleId}/lang-id/${langId}/country-filter-id/0`;

  try {
    const [detailRes, criteriaRes, partsRes] = await Promise.all([
      fetch(detailUrl, { headers, next: { revalidate: 300 } }),
      fetch(criteriaUrl, { headers, next: { revalidate: 300 } }),
      fetch(partsUrl, { headers, next: { revalidate: 300 } }),
    ]);

    if (!detailRes.ok) {
      return NextResponse.json({ error: `API error ${detailRes.status}` }, { status: detailRes.status });
    }

    const data = await detailRes.json();

    let selectionCriterias: { criteriaName: string; criteriaValue: string }[] = [];
    if (criteriaRes.ok) {
      const cd = await criteriaRes.json();
      selectionCriterias = Array.isArray(cd) ? cd : [];
    } else {
      const fallback = await fetch(criteriaUrl0, { headers, next: { revalidate: 300 } });
      if (fallback.ok) {
        const fd = await fallback.json();
        selectionCriterias = Array.isArray(fd) ? fd : [];
      }
    }

    type PartItem = { articleNo: string; articleStatus: string; articleProductName: string; quantity: number; orderInList: number };
    let articleParts: PartItem[] = [];
    if (partsRes.ok) {
      const pd = await partsRes.json();
      articleParts = Array.isArray(pd.articles) ? pd.articles : [];
    } else {
      const fallback = await fetch(partsUrl0, { headers, next: { revalidate: 300 } });
      if (fallback.ok) {
        const fd = await fallback.json();
        articleParts = Array.isArray(fd.articles) ? fd.articles : [];
      }
    }

    return NextResponse.json({ ...data, articleSelectionCriterias: selectionCriterias, articleParts });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
