import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function toDecimal(v: unknown): Prisma.Decimal {
  return new Prisma.Decimal(String(v ?? 0));
}

function toDecimalOrNull(v: unknown): Prisma.Decimal | null {
  if (v === null || v === undefined) return null;
  return new Prisma.Decimal(String(v));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
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

  // Reject files that are too large to parse safely in memory (limit: 50 MB).
  // Products are excluded from backups and should be restored via CSV import.
  const MAX_BYTES = 50 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "Backup file is too large. Products are excluded from JSON backups — restore them via CSV import instead." },
      { status: 413 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let backup: { version: string; data: Record<string, any[]> };
  try {
    const text = await file.text();
    backup = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid backup file format — could not parse JSON." }, { status: 400 });
  }

  if (!backup.version || !backup.data || typeof backup.data !== "object") {
    return Response.json({ error: "Invalid backup file format — missing version or data." }, { status: 400 });
  }

  const d = backup.data;

  try {
    await prisma.$transaction(
      async (tx) => {
        // Delete in reverse dependency order
        await tx.offerItem.deleteMany();
        await tx.offer.deleteMany();
        await tx.vehicle.deleteMany();
        await tx.customer.deleteMany();
        await tx.priceRule.deleteMany();
        await tx.session.deleteMany();
        await tx.account.deleteMany();
        await tx.verificationToken.deleteMany();
        await tx.user.deleteMany();
        await tx.settings.deleteMany();

        if (d.settings?.length) {
          for (const s of d.settings) {
            await tx.settings.create({
              data: {
                id: s.id as string,
                companyName: (s.companyName as string) ?? "",
                companyVAT: s.companyVAT as string | null,
                companyAddress: s.companyAddress as string | null,
                companyEmail: s.companyEmail as string | null,
                companyPhone: s.companyPhone as string | null,
                companyLogo: s.companyLogo as string | null,
                defaultVATRate: toDecimal(s.defaultVATRate),
                defaultLanguage: (s.defaultLanguage as string) ?? "en",
                currency: (s.currency as string) ?? "EUR",
                offerPrefix: (s.offerPrefix as string) ?? "OFF",
                invoicePrefix: (s.invoicePrefix as string) ?? "INV",
                pdfFooterText: s.pdfFooterText as string | null,
                termsAndConditions: s.termsAndConditions as string | null,
                updatedAt: toDate(s.updatedAt) ?? new Date(),
              },
            });
          }
        }

        // Key may be "user" (new format) or "users" (legacy format)
        const users = d.user ?? d.users ?? [];
        for (const u of users) {
          await tx.user.create({
            data: {
              id: u.id as string,
              name: u.name as string | null,
              email: u.email as string,
              emailVerified: toDate(u.emailVerified),
              image: u.image as string | null,
              password: u.password as string | null,
              role: (u.role as "ADMIN" | "EMPLOYEE") ?? "EMPLOYEE",
              isActive: (u.isActive as boolean) ?? true,
              createdAt: toDate(u.createdAt) ?? new Date(),
              updatedAt: toDate(u.updatedAt) ?? new Date(),
            },
          });
        }

        const accounts = d.account ?? d.accounts ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (accounts.length) await tx.account.createMany({ data: accounts as any[] });

        const sessions = d.session ?? d.sessions ?? [];
        for (const s of sessions) {
          await tx.session.create({
            data: {
              id: s.id as string,
              sessionToken: s.sessionToken as string,
              userId: s.userId as string,
              expires: toDate(s.expires) ?? new Date(),
            },
          });
        }

        const verificationTokens = d.verificationToken ?? d.verificationTokens ?? [];
        for (const v of verificationTokens) {
          await tx.verificationToken.create({
            data: {
              identifier: v.identifier as string,
              token: v.token as string,
              expires: toDate(v.expires) ?? new Date(),
            },
          });
        }

        const customers = d.customer ?? d.customers ?? [];
        for (const c of customers) {
          await tx.customer.create({
            data: {
              id: c.id as string,
              firstName: c.firstName as string,
              lastName: c.lastName as string,
              email: c.email as string | null,
              phone: c.phone as string | null,
              mobile: c.mobile as string | null,
              companyName: c.companyName as string | null,
              taxNumber: c.taxNumber as string | null,
              address: c.address as string | null,
              city: c.city as string | null,
              postalCode: c.postalCode as string | null,
              country: (c.country as string) ?? "SI",
              notes: c.notes as string | null,
              defaultDiscount: toDecimalOrNull(c.defaultDiscount),
              isActive: (c.isActive as boolean) ?? true,
              createdAt: toDate(c.createdAt) ?? new Date(),
              updatedAt: toDate(c.updatedAt) ?? new Date(),
              createdById: c.createdById as string | null,
            },
          });
        }

        const vehicles = d.vehicle ?? d.vehicles ?? [];
        for (const v of vehicles) {
          await tx.vehicle.create({
            data: {
              id: v.id as string,
              customerId: v.customerId as string,
              make: v.make as string,
              model: v.model as string,
              year: v.year as number,
              vin: v.vin as string | null,
              registrationPlate: v.registrationPlate as string | null,
              fuelType:
                (v.fuelType as "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC" | "LPG" | "OTHER") ??
                "PETROL",
              mileage: v.mileage as number | null,
              color: v.color as string | null,
              notes: v.notes as string | null,
              isActive: (v.isActive as boolean) ?? true,
              createdAt: toDate(v.createdAt) ?? new Date(),
              updatedAt: toDate(v.updatedAt) ?? new Date(),
              createdById: v.createdById as string | null,
            },
          });
        }

        const offers = d.offer ?? d.offers ?? [];
        for (const o of offers) {
          await tx.offer.create({
            data: {
              id: o.id as string,
              offerNumber: o.offerNumber as string,
              status:
                (o.status as "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "COMPLETED") ?? "DRAFT",
              customerId: o.customerId as string,
              vehicleId: o.vehicleId as string | null,
              mileage: o.mileage as number | null,
              currency: (o.currency as string) ?? "EUR",
              notes: o.notes as string | null,
              validUntil: toDate(o.validUntil),
              createdAt: toDate(o.createdAt) ?? new Date(),
              updatedAt: toDate(o.updatedAt) ?? new Date(),
              createdById: o.createdById as string | null,
            },
          });
        }

        const offerItems = d.offerItem ?? d.offerItems ?? [];
        for (const item of offerItems) {
          await tx.offerItem.create({
            data: {
              id: item.id as string,
              offerId: item.offerId as string,
              position: item.position as number,
              productId: item.productId as string | null,
              productNumber: item.productNumber as string | null,
              description: item.description as string,
              quantity: toDecimal(item.quantity),
              unit: (item.unit as string) ?? "pcs",
              pricePerUnit: toDecimal(item.pricePerUnit),
              vatRate: toDecimal(item.vatRate),
              discount: toDecimal(item.discount),
            },
          });
        }

        const priceRules = d.priceRule ?? d.priceRules ?? [];
        for (const r of priceRules) {
          await tx.priceRule.create({
            data: {
              id: r.id as string,
              filterType: r.filterType as string,
              filterValue: r.filterValue as string,
              adjustmentType: r.adjustmentType as string,
              adjustmentValue: toDecimal(r.adjustmentValue),
              isActive: (r.isActive as boolean) ?? true,
              createdAt: toDate(r.createdAt) ?? new Date(),
              updatedAt: toDate(r.updatedAt) ?? new Date(),
            },
          });
        }
      },
      { timeout: 120_000 }
    );
  } catch (err) {
    console.error("[backup/restore]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Restore failed" },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
