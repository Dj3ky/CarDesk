import { auth } from "@/lib/auth";
import { spawn } from "child_process";
import { existsSync } from "fs";
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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn("bash", ["update.sh"], {
        cwd: projectRoot,
        env: { ...process.env, FORCE_COLOR: "0" },
      });

      function send(data: Buffer) {
        const clean = data.toString().replace(ANSI_RE, "");
        controller.enqueue(encoder.encode(clean));
      }

      proc.stdout.on("data", send);
      proc.stderr.on("data", send);

      proc.on("close", (code: number | null) => {
        controller.enqueue(
          encoder.encode(`\n[Process exited with code ${code ?? "unknown"}]`)
        );
        controller.close();
      });

      proc.on("error", (err: Error) => {
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
