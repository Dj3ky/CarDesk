import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const scheduleSchema = z.object({
  backupSchedule: z.enum(["disabled", "daily", "weekly"]),
  backupScheduleHour: z.coerce.number().int().min(0).max(23),
  backupRetentionDays: z.coerce.number().int().min(1).max(365),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed" }, { status: 400 });
  }

  await prisma.settings.upsert({
    where: { id: "settings" },
    create: { id: "settings", ...parsed.data },
    update: parsed.data,
  });

  revalidateTag("settings", { expire: 0 });
  return Response.json({ success: true });
}
