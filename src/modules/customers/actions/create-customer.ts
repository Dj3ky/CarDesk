"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerSchema, type CustomerFormValues } from "../schemas/customer.schema";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "../types";
import type { Customer } from "@prisma/client";

export async function createCustomer(
  data: CustomerFormValues
): Promise<ActionResult<Customer>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const parsed = customerSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        ...parsed.data,
        createdById: session.user.id,
      },
    });

    await logAudit({
      action: "CREATE",
      entity: "CUSTOMER",
      entityId: customer.id,
      entityLabel: customer.companyName ?? `${customer.lastName} ${customer.firstName}`,
      userId: session.user.id,
    });

    revalidatePath("/customers");
    return { success: true, data: customer };
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2002") {
      return { success: false, error: "A customer with this email already exists" };
    }
    return { success: false, error: "Failed to create customer" };
  }
}
