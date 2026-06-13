import { auth } from "@/lib/auth";
import { spawn } from "child_process";

export const runtime = "nodejs";

// Strip ANSI colour/style escape sequences from shell output
const ANSI_RE = /\x1b\[[0-9;]*[mGKHF]/g;

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn("bash", ["update.sh"], {
        cwd: process.cwd(),
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
