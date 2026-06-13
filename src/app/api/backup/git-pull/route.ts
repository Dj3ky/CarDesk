import { auth } from "@/lib/auth";
import { spawn } from "child_process";
import { existsSync, rmSync } from "fs";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 600; // 10 minutes — npm install + build can be slow

const ANSI_RE = /\x1b\[[0-9;]*[mGKHF]/g;

// Walk up from cwd until we find the directory that contains update.sh.
// In dev cwd is the project root; in standalone production it is .next/standalone.
function findProjectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(dir, "update.sh"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectRoot = findProjectRoot();

  if (!existsSync(path.join(projectRoot, ".env.local"))) {
    return Response.json(
      { error: ".env.local not found — run install.sh on the server first." },
      { status: 500 }
    );
  }

  // Remove stale standalone build before npm install runs.
  // Corrupted Prisma files inside .next/standalone/node_modules/ cause npm to
  // fail even when installing into the project root (NODE_PATH pollution).
  const standaloneDir = path.join(projectRoot, ".next", "standalone");
  if (existsSync(standaloneDir)) {
    try {
      rmSync(standaloneDir, { recursive: true, force: true });
    } catch {
      // Non-fatal — update.sh cleans it too
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Strip env vars the standalone server sets that redirect npm/Node module
      // resolution into .next/standalone/node_modules/ instead of the project root.
      const STRIP = /^(npm_|NODE_PATH$|NODE_OPTIONS$)/;
      const env = Object.fromEntries(
        Object.entries(process.env).filter(([k]) => !STRIP.test(k))
      ) as NodeJS.ProcessEnv;
      env.FORCE_COLOR = "0";

      const proc = spawn("bash", ["update.sh"], {
        cwd: projectRoot,
        env,
      });

      function send(data: Buffer) {
        const clean = data.toString().replace(ANSI_RE, "");
        controller.enqueue(encoder.encode(clean));
      }

      // Send a keepalive dot every 25 s so nginx (60 s proxy_read_timeout)
      // does not drop the connection during silent steps like npm install.
      let lastOutput = Date.now();
      const heartbeat = setInterval(() => {
        if (Date.now() - lastOutput >= 25_000) {
          try {
            controller.enqueue(encoder.encode("."));
          } catch {
            clearInterval(heartbeat);
          }
        }
      }, 25_000);

      proc.stdout.on("data", (data: Buffer) => {
        lastOutput = Date.now();
        send(data);
      });
      proc.stderr.on("data", (data: Buffer) => {
        lastOutput = Date.now();
        send(data);
      });

      proc.on("close", (code: number | null) => {
        clearInterval(heartbeat);
        controller.enqueue(
          encoder.encode(`\n[Process exited with code ${code ?? "unknown"}]`)
        );
        controller.close();
      });

      proc.on("error", (err: Error) => {
        clearInterval(heartbeat);
        controller.enqueue(encoder.encode(`\nError: ${err.message}`));
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
