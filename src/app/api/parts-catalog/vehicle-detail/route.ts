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
  const { vehicleId, locale } = body as { vehicleId?: number; locale?: string };
  if (!vehicleId) return NextResponse.json({ error: "vehicleId required" }, { status: 400 });

  const langId = LOCALE_TO_LANG[locale ?? ""] ?? DEFAULT_LANG;
  const makeUrl = (countryId: number) =>
    `${BASE_URL}/api/types/type-id/1/vehicle-type-details/${vehicleId}/lang-id/${langId}/country-filter-id/${countryId}`;

  const headers = { "x-apiprofile-key": settings.partsCatalogApiKey, Accept: "application/json" };

  try {
    for (const countryId of [COUNTRY_FILTER_ID, 0]) {
      const res = await fetch(makeUrl(countryId), { headers, next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const data = await res.json();
      const detail = data.vehicleTypeDetails ?? data;
      if (detail && Object.keys(detail).length > 0) {
        return NextResponse.json(detail);
      }
    }
    return NextResponse.json({ error: "Vehicle details not found" }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
