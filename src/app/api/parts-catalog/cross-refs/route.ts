import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSettings } from "@/modules/settings/actions/get-settings";

const BASE_URL = "https://auto-parts-catalog.apiprofile.com";
const LOCALE_TO_LANG: Record<string, number> = { en: 4, sl: 36 };
const DEFAULT_LANG = 4;

async function fetchCrossRefs(articleId: number, langId: number, apiKey: string) {
  const url = `${BASE_URL}/api/artlookup/select-article-cross-references/article-id/${articleId}/lang-id/${langId}`;
  const res = await fetch(url, {
    headers: { "x-apiprofile-key": apiKey, Accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data.articles ?? data.data ?? []);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getSettings();
  if (!settings.partsCatalogApiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { articleIds, locale } = body as { articleIds?: number[]; locale?: string };
  if (!articleIds?.length) return NextResponse.json({ error: "articleIds required" }, { status: 400 });

  const langId = LOCALE_TO_LANG[locale ?? ""] ?? DEFAULT_LANG;
  const apiKey = settings.partsCatalogApiKey;

  const seen = new Set<number>(articleIds);
  const result: unknown[] = [];

  // Level 1: cross-refs for original articles
  const level1 = await Promise.all(articleIds.map((id) => fetchCrossRefs(id, langId, apiKey)));
  const level1Articles = level1.flat().filter((a: { articleId?: number }) => {
    if (!a.articleId || seen.has(a.articleId)) return false;
    seen.add(a.articleId);
    result.push(a);
    return true;
  });

  // Level 2: cross-refs for level 1 results
  if (level1Articles.length > 0) {
    const level2 = await Promise.all(
      level1Articles.map((a: { articleId?: number }) => fetchCrossRefs(a.articleId!, langId, apiKey))
    );
    level2.flat().forEach((a: { articleId?: number }) => {
      if (!a.articleId || seen.has(a.articleId)) return;
      seen.add(a.articleId);
      result.push(a);
    });
  }

  console.log("[cross-refs] result:", JSON.stringify(result, null, 2));
  return NextResponse.json({ articles: result });
}
