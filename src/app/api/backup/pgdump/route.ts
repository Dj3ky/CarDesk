import { spawn } from "child_process";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { saveBackupToDisk, pruneOldBackups } from "@/lib/backup-util";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?save=1 saves to server disk instead of streaming to browser
  if (req.nextUrl.searchParams.get("save") === "1") {
    try {
      const filename = await saveBackupToDisk();
      const settings = await prisma.settings.findUnique({ where: { id: "settings" } });
      if (settings) await pruneOldBackups(settings.backupRetentionDays);
      return Response.json({ success: true, filename });
    } catch (err) {
      console.error("[backup/pgdump save]", err);
      return Response.json({ error: err instanceof Error ? err.message : "Backup failed" }, { status: 500 });
    }
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

  const filename = `cardesk-pgdump-${new Date().toISOString().slice(0, 10)}.dump`;

  const pgdump = spawn(
    "pg_dump",
    [
      "--host", url.hostname,
      "--port", url.port || "5432",
      "--username", url.username,
      "--dbname", url.pathname.replace(/^\//, ""),
      "--format", "custom",
      "--no-password",
    ],
    {
      env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
    }
  );

  const stderrChunks: Buffer[] = [];
  pgdump.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

  const webStream = new ReadableStream({
    start(controller) {
      pgdump.stdout.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      pgdump.stdout.on("end", () => controller.close());
      pgdump.stdout.on("error", (err) => controller.error(err));
      pgdump.on("close", (code) => {
        if (code !== 0) {
          const msg = Buffer.concat(stderrChunks).toString();
          controller.error(new Error(`pg_dump exited ${code}: ${msg}`));
        }
      });
    },
    cancel() {
      pgdump.kill();
    },
  });

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
