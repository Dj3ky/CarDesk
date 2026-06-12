"use server";

import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { settingsSchema } from "../schemas/settings.schema";
import type { ActionResult } from "../types";

export async function updateSettings(data: unknown): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = settingsSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const d = parsed.data;

  const settingsData = {
    companyName: d.companyName,
    companyVAT: d.companyVAT ?? null,
    companyAddress: d.companyAddress ?? null,
    companyEmail: d.companyEmail ?? null,
    companyPhone: d.companyPhone ?? null,
    companyLogo: d.companyLogo ?? null,
    defaultVATRate: new Prisma.Decimal(d.defaultVATRate),
    defaultLanguage: d.defaultLanguage,
    currency: d.currency,
    offerPrefix: d.offerPrefix,
    invoicePrefix: d.invoicePrefix,
    pdfFooterText: d.pdfFooterText ?? null,
    termsAndConditions: d.termsAndConditions ?? null,
  };

  await prisma.settings.upsert({
    where: { id: "settings" },
    create: { id: "settings", ...settingsData },
    update: settingsData,
  });

  revalidateTag("settings", { expire: 0 });
  return { success: true };
}
