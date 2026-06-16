import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSettings } from "@/modules/settings/actions/get-settings";

const BASE_URL = "https://auto-parts-catalog.apiprofile.com";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings();
  if (!settings.partsCatalogApiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 400 });
  }

  try {
    const apiRes = await fetch(`${BASE_URL}/api/languages/list`, {
      headers: {
        "x-apiprofile-key": settings.partsCatalogApiKey,
        "Accept": "application/json",
      },
      next: { revalidate: 86400 },
    });

    const data = await apiRes.json();
    console.log("[parts-catalog/languages]", JSON.stringify(data, null, 2));
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
