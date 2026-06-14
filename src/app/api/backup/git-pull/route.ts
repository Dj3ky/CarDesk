import { auth } from "@/lib/auth";
import { spawn } from "child_process";
import { existsSync, rmSync } from "fs";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 600; // 10 minutes — npm install + build can be slow

const ANSI_RE = /\x1b\[[0-9;]*[mGKHF]/g;

// Find the real project root, skipping .next directories.
// Next.js standalone copies update.sh into .next/standalone via file tracing,
// so a naive upward walk returns the wrong directory. Strip .next first.
function findProjectRoot(): string {
  const cwd = process.cwd();
  // Fast path: strip everything from /.next onwards
  const nextIdx = cwd.indexOf(path.sep + ".next");
  if (nextIdx !== -1) {
    const candidate = cwd.slice(0, nextIdx);
    if (existsSync(path.join(candidate, "update.sh"))) return candidate;
  }
  // Fallback: walk upward but skip any directory whose path contains .next
  let dir = cwd;
  for (let i = 0; i < 10; i++) {
    if (!dir.includes(path.sep + ".next") && existsSync(path.join(dir, "update.sh"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return cwd;
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
      // Give the child process a minimal, clean environment.
      // The standalone server sets NODE_PATH (and npm_* vars) that redirect Node
      // module resolution into .next/standalone/node_modules/ even when env -i is
      // used inside update.sh — because npm re-sets NODE_PATH before executing
      // scripts. Starting with only the bare essentials prevents any leakage.
      const systemPath = (process.env.PATH ?? "")
        .split(":")
        .filter((p) => !p.includes(".next"))
        .join(":");
      const env = {
        HOME: process.env.HOME ?? "/root",
        USER: process.env.USER ?? "root",
        PATH: systemPath || "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        TERM: "dumb",
        FORCE_COLOR: "0",
        NODE_ENV: process.env.NODE_ENV ?? "production",
      } satisfies NodeJS.ProcessEnv;

      // Pass the absolute script path so ${BASH_SOURCE[0]} inside update.sh is
      // always absolute. If it were relative ("update.sh") and the cwd changed,
      // dirname would return "." and cd would silently stay in the wrong directory.
      const proc = spawn("bash", [path.join(projectRoot, "update.sh")], {
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
