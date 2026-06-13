import { auth } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execAsync = promisify(exec);

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cwd = process.cwd();

    await execAsync("git fetch origin master", { cwd });

    const [{ stdout: localHash }, { stdout: remoteHash }, { stdout: behindCount }] =
      await Promise.all([
        execAsync("git rev-parse HEAD", { cwd }),
        execAsync("git rev-parse origin/master", { cwd }),
        execAsync("git rev-list HEAD..origin/master --count", { cwd }),
      ]);

    const behind = parseInt(behindCount.trim(), 10);

    return Response.json({
      upToDate: behind === 0,
      commitsBehind: behind,
      localHash: localHash.trim().slice(0, 7),
      remoteHash: remoteHash.trim().slice(0, 7),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Check failed" },
      { status: 500 }
    );
  }
}
