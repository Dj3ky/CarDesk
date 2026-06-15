import { after } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processImportJob } from "@/modules/import/lib/process-import";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.createdById !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (job.status !== "PENDING") {
    return Response.json(
      { error: "Job is already started or completed" },
      { status: 409 }
    );
  }

  let body: {
    mapping?: Record<string, string>;
    syncMode?: boolean;
    syncSupplier?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.mapping || typeof body.mapping !== "object") {
    return Response.json({ error: "mapping is required" }, { status: 400 });
  }

  const syncMode = body.syncMode === true;
  const syncSupplier = syncMode && body.syncSupplier?.trim()
    ? body.syncSupplier.trim()
    : null;

  if (syncMode && !syncSupplier) {
    return Response.json(
      { error: "syncSupplier is required when syncMode is enabled" },
      { status: 400 }
    );
  }

  // Save mapping and mark as processing
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      mapping: body.mapping as Record<string, string>,
      syncMode,
      syncSupplier,
      status: "PROCESSING",
    },
  });

  // Run processing after response is sent
  after(async () => {
    await processImportJob(jobId);
  });

  return Response.json({ started: true }, { status: 202 });
}
