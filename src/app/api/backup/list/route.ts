import { auth } from "@/lib/auth";
import { listBackups } from "@/lib/backup-util";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await listBackups();
  return Response.json(entries);
}
