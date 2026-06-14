import { spawn } from "child_process";
import { createWriteStream } from "fs";
import { unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Parents before children — respects every FK in the schema
const RESTORE_ORDER = [
  "Settings",
  "User",
  "Account",
  "Session",
  "VerificationToken",
  "Customer",
  "Vehicle",
  "Product",
  "ImportJob",
  "PriceRule",
  "Offer",
  "OfferItem",
  "AuditLog",
];

function pgRestoreTable(
  dumpFile: string,
  table: string,
  url: URL
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(
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
        `--table=${table}`,
        dumpFile,
      ],
      { env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) } }
    );

    const chunks: Buffer[] = [];
    proc.stderr.on("data", (c: Buffer) => chunks.push(c));
    proc.on("close", (code) =>
      resolve({ code: code ?? 1, stderr: Buffer.concat(chunks).toString() })
    );
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return Response.json({ error: "DATABASE_URL not configured" }, { status: 500 });

  let url: URL;
  try {
    url = new URL(dbUrl);
  } catch {
    return Response.json({ error: "Invalid DATABASE_URL" }, { status: 500 });
  }

  if (!req.body) return Response.json({ error: "No file body provided" }, { status: 400 });

  // Stream the upload to a temp file so we can run one pg_restore per table
  const tmpFile = join(tmpdir(), `cardesk-restore-${Date.now()}.dump`);
  try {
    const readable = Readable.fromWeb(
      req.body as import("stream/web").ReadableStream<Uint8Array>
    );
    await pipeline(readable, createWriteStream(tmpFile));
  } catch (err) {
    await unlink(tmpFile).catch(() => {});
    return Response.json(
      { error: `Failed to save upload: ${err instanceof Error ? err.message : err}` },
      { status: 500 }
    );
  }

  try {
    // Wipe all data (CASCADE handles FK order for DELETE)
    await prisma.$executeRaw`
      TRUNCATE TABLE
        "AuditLog", "OfferItem", "Offer", "Vehicle", "Customer",
        "Product", "ImportJob", "PriceRule",
        "Session", "Account", "VerificationToken", "User", "Settings"
      CASCADE
    `;

    // Restore each table in parent-first order — no trigger manipulation needed
    for (const table of RESTORE_ORDER) {
      const { code, stderr } = await pgRestoreTable(tmpFile, table, url);
      if (code !== 0) {
        return Response.json(
          { error: `pg_restore failed on table "${table}": ${stderr.slice(0, 400)}` },
          { status: 500 }
        );
      }
    }
  } catch (err) {
    console.error("[backup/pgrestore]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Restore failed" },
      { status: 500 }
    );
  } finally {
    await unlink(tmpFile).catch(() => {});
  }

  return Response.json({ success: true });
}
