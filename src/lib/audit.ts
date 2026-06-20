"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE" | "LOGIN" | "LOGIN_FAILED";
export type AuditEntity = "OFFER" | "CUSTOMER" | "VEHICLE" | "PRODUCT" | "USER" | "SETTINGS" | "WORK_ORDER";

export async function logAudit(params: {
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityLabel?: string;
  userId?: string | null;
  changes?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        entityLabel: params.entityLabel ?? null,
        userId: params.userId ?? null,
        changes: params.changes ?? undefined,
      },
    });
  } catch {
    // Audit failures must never break business logic
  }
}
