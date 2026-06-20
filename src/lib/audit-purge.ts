import { prisma } from "@/lib/prisma";

export async function purgeAuditLog() {
  const settings = await prisma.settings.findUnique({
    where: { id: "settings" },
    select: { auditRetentionDays: true },
  });
  const days = settings?.auditRetentionDays ?? 0;
  if (days <= 0) return;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
}
