import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSettings } from "@/modules/settings/actions/get-settings";

const BASE_URL = "https://auto-parts-catalog.apiprofile.com";

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

  const { vin } = body as { vin?: string };
  if (!vin?.trim()) {
    return NextResponse.json({ error: "Missing VIN" }, { status: 400 });
  }

  const encoded = encodeURIComponent(vin.trim().toUpperCase());
  const apiUrl = `${BASE_URL}/api/vin/decoder-v2/${encoded}`;

  try {
    const apiRes = await fetch(apiUrl, {
      headers: {
        "x-apiprofile-key": settings.partsCatalogApiKey,
        "Accept": "application/json",
      },
    });

    if (!apiRes.ok) {
      const text = await apiRes.text().catch(() => "");
      console.error(`[parts-catalog/vin] API error ${apiRes.status}:`, text);
      return NextResponse.json(
        { error: `API error: ${apiRes.status} — ${text.slice(0, 200)}` },
        { status: apiRes.status >= 500 ? 502 : apiRes.status }
      );
    }

    const data = await apiRes.json();
    console.log("[parts-catalog/vin] response:", JSON.stringify(data, null, 2));
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[parts-catalog/vin] fetch error:", err);
    return NextResponse.json({ error: `Failed to reach parts catalog API: ${String(err)}` }, { status: 502 });
  }
}
