import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSettings } from "@/modules/settings/actions/get-settings";

const BASE_URL = "https://auto-parts-catalog.apiprofile.com";
const DEFAULT_LANG = 1; // 1 = English

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings();
  if (!settings.partsCatalogApiKey) {
    return NextResponse.json(
      { error: "Parts catalog API key not configured. Go to Settings → Integrations." },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const params = body as { type?: string; query?: string; typeId?: number; langId?: number };
  const langId = params.langId ?? DEFAULT_LANG;

  let apiUrl: string;

  if (params.type === "oem") {
    if (!params.query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }
    const encoded = encodeURIComponent(params.query.trim());
    apiUrl = `${BASE_URL}/api/articles-oem/search-by-article-oem-no?articleOemNo=${encoded}&langId=${langId}`;
  } else if (params.type === "vehicle") {
    if (!params.typeId) {
      return NextResponse.json({ error: "Missing typeId" }, { status: 400 });
    }
    apiUrl = `${BASE_URL}/api/articles/list/type-id/1/vehicle-id/${params.typeId}/category-id/0/lang-id/${langId}`;
  } else {
    return NextResponse.json({ error: "Invalid search type" }, { status: 400 });
  }

  console.log("[parts-catalog] calling:", apiUrl);
  try {
    const apiRes = await fetch(apiUrl, {
      headers: {
        "x-apiprofile-key": settings.partsCatalogApiKey,
        "Accept": "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!apiRes.ok) {
      const text = await apiRes.text().catch(() => "");
      console.error(`[parts-catalog] API error ${apiRes.status}:`, text);
      return NextResponse.json(
        { error: `API error: ${apiRes.status} — ${text.slice(0, 200)}` },
        { status: apiRes.status >= 500 ? 502 : apiRes.status }
      );
    }

    const data = await apiRes.json();
    console.log("[parts-catalog] raw response keys:", JSON.stringify(Object.keys(data ?? {})));
    console.log("[parts-catalog] first item:", JSON.stringify(Array.isArray(data) ? data[0] : (data?.data?.[0] ?? data)));
    // Normalise: the API may return an array directly or { articles: [...] }
    const articles = Array.isArray(data) ? data : (data.articles ?? data.data ?? []);
    return NextResponse.json({ articles, _raw: data });
  } catch (err) {
    console.error("[parts-catalog] fetch error:", err);
    return NextResponse.json({ error: `Failed to reach parts catalog API: ${String(err)}` }, { status: 502 });
  }
}
