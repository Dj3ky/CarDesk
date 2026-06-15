import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      filename: true,
      totalRows: true,
      processedRows: true,
      insertedRows: true,
      updatedRows: true,
      deletedRows: true,
      errorRows: true,
      errors: true,
      syncMode: true,
      syncSupplier: true,
      createdAt: true,
      completedAt: true,
      createdById: true,
    },
  });

  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.createdById !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json(job);
}
