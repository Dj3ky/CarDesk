import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSettings } from "@/modules/settings/actions/get-settings";

const BASE_URL = "https://auto-parts-catalog.apiprofile.com";
const LOCALE_TO_LANG: Record<string, number> = { en: 4, sl: 36 };
const DEFAULT_LANG = 4;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings();
  if (!settings.partsCatalogApiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { vehicleId, locale } = body as { vehicleId?: number; locale?: string };

  if (!vehicleId) {
    return NextResponse.json({ error: "Missing vehicleId" }, { status: 400 });
  }

  const langId = LOCALE_TO_LANG[locale ?? ""] ?? DEFAULT_LANG;
  const apiUrl = `${BASE_URL}/api/category/type-id/1/products-groups-variant-1/${vehicleId}/lang-id/${langId}`;

  try {
    const apiRes = await fetch(apiUrl, {
      headers: {
        "x-apiprofile-key": settings.partsCatalogApiKey,
        "Accept": "application/json",
      },
      next: { revalidate: 300 },
    });

    const data = await apiRes.json();
    const first = Array.isArray(data) ? data[0] : data;
    console.log("[parts-catalog/categories] first:", JSON.stringify(first, null, 2));
    const categories = Array.isArray(data) ? data : (data.categories ?? data.data ?? []);
    return NextResponse.json({ categories });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
