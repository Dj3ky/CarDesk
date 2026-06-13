import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface BackupData {
  version: string;
  createdAt: string;
  data: {
    settings: Record<string, unknown>[];
    users: Record<string, unknown>[];
    customers: Record<string, unknown>[];
    vehicles: Record<string, unknown>[];
    products: Record<string, unknown>[];
    offers: Record<string, unknown>[];
    offerItems: Record<string, unknown>[];
    importJobs: Record<string, unknown>[];
    accounts: Record<string, unknown>[];
    sessions: Record<string, unknown>[];
    verificationTokens: Record<string, unknown>[];
  };
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function toDecimal(v: unknown): Prisma.Decimal {
  return new Prisma.Decimal(String(v ?? 0));
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

  let backup: BackupData;
  try {
    const text = await file.text();
    backup = JSON.parse(text) as BackupData;
  } catch {
    return Response.json({ error: "Invalid backup file format" }, { status: 400 });
  }

  if (!backup.version || !backup.data) {
    return Response.json({ error: "Invalid backup file format" }, { status: 400 });
  }

  const d = backup.data;

  try {
    await prisma.$transaction(
      async (tx) => {
        // Delete in reverse dependency order
        await tx.offerItem.deleteMany();
        await tx.offer.deleteMany();
        await tx.importJob.deleteMany();
        await tx.vehicle.deleteMany();
        await tx.customer.deleteMany();
        await tx.product.deleteMany();
        await tx.session.deleteMany();
        await tx.account.deleteMany();
        await tx.verificationToken.deleteMany();
        await tx.user.deleteMany();
        await tx.settings.deleteMany();

        // Re-insert in dependency order
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

        if (d.users?.length) {
          for (const u of d.users) {
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
        }

        if (d.accounts?.length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await tx.account.createMany({ data: d.accounts as any[] });
        }

        if (d.sessions?.length) {
          for (const s of d.sessions) {
            await tx.session.create({
              data: {
                id: s.id as string,
                sessionToken: s.sessionToken as string,
                userId: s.userId as string,
                expires: toDate(s.expires) ?? new Date(),
              },
            });
          }
        }

        if (d.verificationTokens?.length) {
          for (const v of d.verificationTokens) {
            await tx.verificationToken.create({
              data: {
                identifier: v.identifier as string,
                token: v.token as string,
                expires: toDate(v.expires) ?? new Date(),
              },
            });
          }
        }

        if (d.customers?.length) {
          for (const c of d.customers) {
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
                isActive: (c.isActive as boolean) ?? true,
                createdAt: toDate(c.createdAt) ?? new Date(),
                updatedAt: toDate(c.updatedAt) ?? new Date(),
                createdById: c.createdById as string | null,
              },
            });
          }
        }

        if (d.vehicles?.length) {
          for (const v of d.vehicles) {
            await tx.vehicle.create({
              data: {
                id: v.id as string,
                customerId: v.customerId as string,
                make: v.make as string,
                model: v.model as string,
                year: v.year as number,
                vin: v.vin as string | null,
                registrationPlate: v.registrationPlate as string | null,
                fuelType: (v.fuelType as "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC" | "LPG" | "OTHER") ?? "PETROL",
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
        }

        if (d.products?.length) {
          for (const p of d.products) {
            await tx.product.create({
              data: {
                id: p.id as string,
                productNumber: p.productNumber as string,
                barcode: p.barcode as string | null,
                description: p.description as string,
                brand: p.brand as string | null,
                supplier: p.supplier as string | null,
                price: toDecimal(p.price),
                vatRate: toDecimal(p.vatRate),
                stock: (p.stock as number) ?? 0,
                unit: (p.unit as string) ?? "pcs",
                isActive: (p.isActive as boolean) ?? true,
                notes: p.notes as string | null,
                createdAt: toDate(p.createdAt) ?? new Date(),
                updatedAt: toDate(p.updatedAt) ?? new Date(),
                createdById: p.createdById as string | null,
              },
            });
          }
        }

        if (d.offers?.length) {
          for (const o of d.offers) {
            await tx.offer.create({
              data: {
                id: o.id as string,
                offerNumber: o.offerNumber as string,
                status: (o.status as "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "COMPLETED") ?? "DRAFT",
                customerId: o.customerId as string,
                vehicleId: o.vehicleId as string | null,
                currency: (o.currency as string) ?? "EUR",
                notes: o.notes as string | null,
                validUntil: toDate(o.validUntil),
                createdAt: toDate(o.createdAt) ?? new Date(),
                updatedAt: toDate(o.updatedAt) ?? new Date(),
                createdById: o.createdById as string | null,
              },
            });
          }
        }

        if (d.offerItems?.length) {
          for (const item of d.offerItems) {
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
        }

        if (d.importJobs?.length) {
          for (const j of d.importJobs) {
            await tx.importJob.create({
              data: {
                id: j.id as string,
                status: (j.status as "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED") ?? "COMPLETED",
                filename: j.filename as string,
                filePath: j.filePath as string,
                totalRows: (j.totalRows as number) ?? 0,
                processedRows: (j.processedRows as number) ?? 0,
                insertedRows: (j.insertedRows as number) ?? 0,
                updatedRows: (j.updatedRows as number) ?? 0,
                errorRows: (j.errorRows as number) ?? 0,
                errors: j.errors ?? [],
                mapping: j.mapping ?? {},
                createdAt: toDate(j.createdAt) ?? new Date(),
                updatedAt: toDate(j.updatedAt) ?? new Date(),
                completedAt: toDate(j.completedAt),
                createdById: j.createdById as string | null,
              },
            });
          }
        }
      },
      { timeout: 60000 }
    );
  } catch (err) {
    console.error("Restore failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Restore failed" },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
