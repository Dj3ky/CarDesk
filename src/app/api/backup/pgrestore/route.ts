import { spawn } from "child_process";
import { Readable } from "stream";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

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

  const pgrestore = spawn(
    "pg_restore",
    [
      "--host", url.hostname,
      "--port", url.port || "5432",
      "--username", url.username,
      "--dbname", url.pathname.replace(/^\//, ""),
      "--clean",
      "--if-exists",
      "--no-password",
      "--single-transaction",
    ],
    {
      env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
    }
  );

  const stderrChunks: Buffer[] = [];
  pgrestore.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

  // Stream the request body directly into pg_restore stdin
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
