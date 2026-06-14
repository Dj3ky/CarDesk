import { spawn } from "child_process";
import { Readable } from "stream";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TABLES = [
  "AuditLog", "OfferItem", "Offer", "Vehicle", "Customer",
  "Product", "ImportJob", "PriceRule",
  "Session", "Account", "VerificationToken", "User", "Settings",
];

async function setTriggers(enabled: boolean) {
  const sql = enabled ? "ENABLE" : "DISABLE";
  for (const table of TABLES) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ${sql} TRIGGER ALL`);
  }
}

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

  try {
    // Wipe all data first
    await prisma.$executeRaw`
      TRUNCATE TABLE
        "AuditLog", "OfferItem", "Offer", "Vehicle", "Customer",
        "Product", "ImportJob", "PriceRule",
        "Session", "Account", "VerificationToken", "User", "Settings"
      CASCADE
    `;

    // Disable FK triggers so pg_restore can insert in dump order
    await setTriggers(false);
  } catch (err) {
    console.error("[backup/pgrestore] pre-restore setup failed", err);
    return Response.json(
      { error: `Failed to prepare database for restore: ${err instanceof Error ? err.message : err}` },
      { status: 500 }
    );
  }

  let restoreCode = 1;
  let restoreStderr = "";

  try {
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

    restoreCode = await new Promise<number>((resolve) => {
      pgrestore.on("close", resolve);
    });
    restoreStderr = Buffer.concat(stderrChunks).toString();
  } finally {
    // Always re-enable triggers, even if restore failed
    await setTriggers(true).catch((err) =>
      console.error("[backup/pgrestore] failed to re-enable triggers", err)
    );
  }

  if (restoreCode !== 0) {
    console.error("[backup/pgrestore]", restoreStderr);
    return Response.json(
      { error: `pg_restore failed: ${restoreStderr.slice(0, 500)}` },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
