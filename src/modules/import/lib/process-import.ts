import { randomUUID } from "crypto";
import { unlink } from "fs/promises";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseFileAllRows, mapAndValidateRow } from "./parse-file";
import type { ValidatedProduct, ImportError, ColumnMapping } from "../types";

const BATCH_SIZE = 500;
const PROGRESS_EVERY = 5000; // update DB after every N rows processed
const MAX_STORED_ERRORS = 500;

async function upsertProductBatch(
  products: ValidatedProduct[],
  createdById: string | null
): Promise<{ inserted: number; updated: number }> {
  if (products.length === 0) return { inserted: 0, updated: 0 };

  const now = new Date();

  const values = products.map((p) =>
    Prisma.sql`(
      ${randomUUID()},
      ${p.productNumber},
      ${p.barcode},
      ${p.description},
      ${p.brand},
      ${p.supplier},
      ${new Prisma.Decimal(p.price)},
      ${new Prisma.Decimal(p.vatRate)},
      ${p.stock},
      ${p.unit},
      ${true},
      ${now},
      ${now},
      ${createdById}
    )`
  );

  const result = await prisma.$queryRaw<{ inserted: boolean }[]>(Prisma.sql`
    INSERT INTO "Product" (
      "id", "productNumber", "barcode", "description",
      "brand", "supplier", "price", "vatRate",
      "stock", "unit", "isActive", "createdAt", "updatedAt", "createdById"
    )
    VALUES ${Prisma.join(values)}
    ON CONFLICT ("productNumber") DO UPDATE SET
      "barcode"     = COALESCE(EXCLUDED."barcode", "Product"."barcode"),
      "description" = EXCLUDED."description",
      "brand"       = COALESCE(EXCLUDED."brand", "Product"."brand"),
      "supplier"    = COALESCE(EXCLUDED."supplier", "Product"."supplier"),
      "price"       = EXCLUDED."price",
      "vatRate"     = EXCLUDED."vatRate",
      "stock"       = EXCLUDED."stock",
      "unit"        = EXCLUDED."unit",
      "updatedAt"   = ${now}
    RETURNING (xmax = 0) AS inserted
  `);

  const inserted = result.filter((r) => r.inserted).length;
  return { inserted, updated: result.length - inserted };
}

export async function processImportJob(jobId: string): Promise<void> {
  try {
    const job = await prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error(`Job ${jobId} not found`);

    const mapping = job.mapping as ColumnMapping;
    const allRows = parseFileAllRows(job.filePath);

    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", totalRows: allRows.length },
    });

    let processedRows = 0;
    let insertedRows = 0;
    let updatedRows = 0;
    let errorRows = 0;
    const errors: ImportError[] = [];
    let lastProgressUpdate = 0;

    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE);
      const validProducts: ValidatedProduct[] = [];

      for (const [j, rawRow] of batch.entries()) {
        const rowNumber = i + j + 2; // +1 for header, +1 for 1-based index
        const result = mapAndValidateRow(rawRow, mapping, rowNumber);
        if ("error" in result) {
          errorRows++;
          if (errors.length < MAX_STORED_ERRORS) errors.push(result.error);
        } else {
          validProducts.push(result.product);
        }
      }

      if (validProducts.length > 0) {
        try {
          const counts = await upsertProductBatch(validProducts, job.createdById);
          insertedRows += counts.inserted;
          updatedRows += counts.updated;
        } catch (err) {
          // Whole batch failed — mark all valid rows as errors
          for (let k = 0; k < validProducts.length; k++) {
            errorRows++;
            if (errors.length < MAX_STORED_ERRORS) {
              errors.push({
                row: i + k + 2,
                message:
                  err instanceof Error ? err.message : "Database error",
              });
            }
          }
        }
      }

      processedRows += batch.length;

      if (
        processedRows - lastProgressUpdate >= PROGRESS_EVERY ||
        processedRows === allRows.length
      ) {
        await prisma.importJob.update({
          where: { id: jobId },
          data: {
            processedRows,
            insertedRows,
            updatedRows,
            errorRows,
            errors: errors as unknown as Prisma.JsonArray,
          },
        });
        lastProgressUpdate = processedRows;
      }
    }

    // Delete temp file
    await unlink(job.filePath).catch(() => {});

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        processedRows,
        insertedRows,
        updatedRows,
        errorRows,
        errors: errors as unknown as Prisma.JsonArray,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    console.error(`[import] job ${jobId} failed:`, err);
    await prisma.importJob
      .update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errors: [
            {
              row: 0,
              message:
                err instanceof Error ? err.message : "Unknown processing error",
            },
          ] as unknown as Prisma.JsonArray,
        },
      })
      .catch(() => {});
  }
}
