import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const VALID_ICONS = new Set([
  "icon-72x72.png",
  "icon-96x96.png",
  "icon-128x128.png",
  "icon-144x144.png",
  "icon-152x152.png",
  "icon-192x192.png",
  "icon-384x384.png",
  "icon-512x512.png",
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  if (!VALID_ICONS.has(name)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    // process.cwd() is .next/standalone/ in production (server.js does process.chdir(__dirname))
    // icons are copied there by update.sh: cp -r public .next/standalone/public
    const iconPath = path.join(process.cwd(), "public", "icons", name);
    const data = await fs.readFile(iconPath);

    return new NextResponse(data, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
