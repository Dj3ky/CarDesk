import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { auth } from "@/lib/auth";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

// Returns the validated MIME type and safe extension based on file magic bytes.
// Returns null if the bytes don't match any allowed format.
function detectImageType(buf: Buffer): { mime: string; ext: string } | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { mime: "image/png", ext: "png" };
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  // WebP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
    return { mime: "image/webp", ext: "webp" };
  }
  // SVG: starts with '<svg' or '<?xml' or whitespace then '<'
  const start = buf.subarray(0, 512).toString("utf8").trimStart();
  if (start.startsWith("<svg") || start.startsWith("<?xml") || start.startsWith("<!DOCTYPE svg")) {
    return { mime: "image/svg+xml", ext: "svg" };
  }
  return null;
}

export function uploadsDir() {
  // UPLOADS_DIR must be an absolute path set in .env.local (see install.sh / update.sh).
  // process.cwd() is NOT the project root in standalone mode — server.js calls
  // process.chdir(__dirname) which sets cwd to .next/standalone/, and rm -rf .next/standalone
  // in update.sh would wipe any uploads stored there.
  if (process.env.UPLOADS_DIR) return process.env.UPLOADS_DIR;
  return join(process.cwd(), "uploads");
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 2 MB" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buf = Buffer.from(bytes);

  const detected = detectImageType(buf);
  if (!detected) {
    return NextResponse.json({ error: "Invalid file type. Allowed: PNG, JPG, SVG, WebP" }, { status: 400 });
  }

  await mkdir(uploadsDir(), { recursive: true });

  const filename = `logo-${Date.now()}.${detected.ext}`;
  await writeFile(join(uploadsDir(), filename), buf);

  return NextResponse.json({ url: `/api/upload/${filename}` });
}
