import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSettings } from "@/modules/settings/actions/get-settings";

const BASE_URL = "https://auto-parts-catalog.apiprofile.com";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getSettings();
  if (!settings.partsCatalogApiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { vehicleId = 10855, articleId = 6184511, langId = 4 } = body as {
    vehicleId?: number;
    articleId?: number;
    langId?: number;
  };

  const candidates = [
    // Vehicle details
    `/api/vehicles/type-id/1/vehicle-id/${vehicleId}/lang-id/${langId}`,
    `/api/vehicles/${vehicleId}/lang-id/${langId}`,
    `/api/vehicle/type-id/1/${vehicleId}/lang-id/${langId}`,
    `/api/vehicles/detail/type-id/1/vehicle-id/${vehicleId}/lang-id/${langId}`,
    `/api/vehicles/attributes/type-id/1/vehicle-id/${vehicleId}/lang-id/${langId}`,
    // Article details
    `/api/articles/${articleId}/lang-id/${langId}`,
    `/api/articles/detail/${articleId}/lang-id/${langId}`,
    `/api/articles/detail/lang-id/${langId}/article-id/${articleId}`,
    // OEM cross-references for an article
    `/api/articles-oem/by-article-id/${articleId}`,
    `/api/articles-oem/list/article-id/${articleId}`,
    `/api/articles/${articleId}/oem-numbers`,
    `/api/articles/${articleId}/oem-numbers/lang-id/${langId}`,
    // Alternatives / comparable
    `/api/articles/${articleId}/alternatives/lang-id/${langId}`,
    `/api/articles/comparable/article-id/${articleId}/lang-id/${langId}`,
  ];

  const headers = {
    "x-apiprofile-key": settings.partsCatalogApiKey,
    "Accept": "application/json",
  };

  const results = await Promise.all(
    candidates.map(async (path) => {
      try {
        const res = await fetch(`${BASE_URL}${path}`, { headers });
        let preview: unknown = null;
        if (res.ok) {
          const text = await res.text();
          try {
            const json = JSON.parse(text);
            preview = Array.isArray(json)
              ? { type: "array", length: json.length, first: json[0] }
              : json;
          } catch {
            preview = text.slice(0, 200);
          }
        }
        return { path, status: res.status, ok: res.ok, preview };
      } catch (e) {
        return { path, status: 0, ok: false, error: String(e) };
      }
    })
  );

  return NextResponse.json({ vehicleId, articleId, langId, results });
}
