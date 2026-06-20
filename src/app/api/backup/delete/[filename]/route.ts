import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { deleteBackup } from "@/lib/backup-util";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;
  const deleted = await deleteBackup(filename);
  if (!deleted) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await logAudit({
    action: "DELETE",
    entity: "BACKUP",
    entityId: filename,
    entityLabel: filename,
    userId: session.user.id,
  });

  return Response.json({ success: true });
}
