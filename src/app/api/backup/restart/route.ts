import { after } from "next/server";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Schedule process exit after the response is flushed to the client.
  // The container orchestrator (Docker, PM2, systemd) will restart the process.
  after(() => {
    process.exit(0);
  });

  return Response.json({ success: true });
}
