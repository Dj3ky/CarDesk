import { spawn } from "child_process";
import { Readable } from "stream";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return Response.json({ error: "DATABASE_URL not configured" }, { status: 500 });
  }

  let url: URL;
  try {
    url = new URL(dbUrl);
  } catch {
    return Response.json({ error: "Invalid DATABASE_URL" }, { status: 500 });
  }

  if (!req.body) {
    return Response.json({ error: "No file body provided" }, { status: 400 });
  }

  // Clear all data first (TRUNCATE CASCADE handles FK order automatically).
  // We do this instead of --clean so we never touch extensions or schema objects
  // that require superuser ownership.
  try {
    await prisma.$executeRaw`
      TRUNCATE TABLE
        "AuditLog", "OfferItem", "Offer", "Vehicle", "Customer",
        "Product", "ImportJob", "PriceRule",
        "Session", "Account", "VerificationToken", "User", "Settings"
      CASCADE
    `;
  } catch (err) {
    console.error("[backup/pgrestore] truncate failed", err);
    return Response.json(
      { error: `Failed to clear database before restore: ${err instanceof Error ? err.message : err}` },
      { status: 500 }
    );
  }

  // Restore data only — schema stays as-is (managed by Prisma migrations).
  // --no-owner / --no-acl skip privilege/ownership commands that need superuser.
  const pgrestore = spawn(
    "pg_restore",
    [
      "--host", url.hostname,
      "--port", url.port || "5432",
      "--username", url.username,
      "--dbname", url.pathname.replace(/^\//, ""),
      "--data-only",
      "--no-owner",
      "--no-acl",
      "--no-password",
    ],
    {
      env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
    }
  );

  const stderrChunks: Buffer[] = [];
  pgrestore.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

  const nodeReadable = Readable.fromWeb(req.body as import("stream/web").ReadableStream<Uint8Array>);
  nodeReadable.pipe(pgrestore.stdin);

  const code = await new Promise<number>((resolve) => {
    pgrestore.on("close", resolve);
  });

  if (code !== 0) {
    const stderr = Buffer.concat(stderrChunks).toString();
    console.error("[backup/pgrestore]", stderr);
    return Response.json(
      { error: `pg_restore failed: ${stderr.slice(0, 500)}` },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
