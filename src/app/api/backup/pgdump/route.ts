import { spawn } from "child_process";
import { Readable } from "stream";
import { auth } from "@/lib/auth";

export async function GET() {
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

  const nodeReadable = pgdump.stdout;

  const webStream = new ReadableStream({
    start(controller) {
      nodeReadable.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      nodeReadable.on("end", () => controller.close());
      nodeReadable.on("error", (err) => controller.error(err));
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
