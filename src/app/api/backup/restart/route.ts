import { after } from "next/server";
import { exec } from "child_process";
import { auth } from "@/lib/auth";

const SERVICE_NAME = process.env.SYSTEMD_SERVICE ?? "cardesk";

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(() => {
    exec(`systemctl restart ${SERVICE_NAME}`, (err) => {
      if (err) {
        // Fallback if systemctl is unavailable (e.g. Docker without systemd)
        process.exit(1);
      }
    });
  });

  return Response.json({ success: true });
}
