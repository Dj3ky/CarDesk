import { createReadStream } from "fs";
import { after, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { backupFilePath } from "@/lib/backup-util";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;
  const filePath = backupFilePath(filename);
  if (!filePath) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  after(() => logAudit({
    action: "CREATE",
    entity: "BACKUP",
    entityId: filename,
    entityLabel: filename,
    userId: session.user.id,
    changes: { method: "download" },
  }));

  const nodeStream = createReadStream(filePath);
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer | string) => controller.enqueue(
        typeof chunk === "string" ? Buffer.from(chunk) : chunk
      ));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
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
