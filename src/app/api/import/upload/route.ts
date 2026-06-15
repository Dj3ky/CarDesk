import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseFilePreview } from "@/modules/import/lib/parse-file";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const filename = file.name;
  const ext = filename.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv";
  if (ext !== "xlsx" && !filename.toLowerCase().endsWith(".csv")) {
    return Response.json(
      { error: "Only CSV and XLSX files are supported" },
      { status: 400 }
    );
  }

  // Clean up any abandoned PENDING jobs from this user (uploaded but never started).
  const staleJobs = await prisma.importJob.findMany({
    where: { createdById: session.user.id, status: "PENDING" },
    select: { id: true, filePath: true },
  });
  if (staleJobs.length > 0) {
    await prisma.importJob.deleteMany({
      where: { id: { in: staleJobs.map((j) => j.id) } },
    });
    await Promise.all(staleJobs.map((j) => unlink(j.filePath).catch(() => {})));
  }

  // Save to temp file
  const tempFilename = `cardesk-import-${randomUUID()}.${ext}`;
  const filePath = join(tmpdir(), tempFilename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  // Parse headers + preview + count
  let parsed;
  try {
    parsed = parseFilePreview(filePath);
  } catch (err) {
    return Response.json(
      {
        error: `Could not parse file: ${err instanceof Error ? err.message : "Unknown error"}`,
      },
      { status: 400 }
    );
  }

  if (parsed.headers.length === 0) {
    return Response.json(
      { error: "File has no column headers" },
      { status: 400 }
    );
  }
  if (parsed.preview.length === 0) {
    return Response.json({ error: "File contains no data rows" }, { status: 400 });
  }

  // Create import job record
  const job = await prisma.importJob.create({
    data: {
      filename,
      filePath,
      totalRows: parsed.totalRows,
      createdById: session.user.id,
    },
  });

  return Response.json({
    jobId: job.id,
    headers: parsed.headers,
    preview: parsed.preview,
    totalRows: parsed.totalRows,
  });
}
