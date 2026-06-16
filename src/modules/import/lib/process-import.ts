import { randomUUID } from "crypto";
import { unlink } from "fs/promises";
import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { invalidateProductCache } from "@/lib/product-cache";
import { parseXlsxAllRows, countCsvRows, streamCsvRows } from "./parse-file";
import { mapAndValidateRow } from "./parse-utils";
import type { ValidatedProduct, ImportError, ColumnMapping } from "../types";

const BATCH_SIZE = 500;
const PROGRESS_EVERY = 5000;
const MAX_STORED_ERRORS = 500;

// Yields control back to the Node.js event loop so other requests
// can be served between processing batches.
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

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
      ${p.substitutionPart},
      ${p.notes},
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
      "brand", "supplier", "substitutionPart", "notes", "price", "vatRate",
      "stock", "unit", "isActive", "createdAt", "updatedAt", "createdById"
    )
    VALUES ${Prisma.join(values)}
    ON CONFLICT ("productNumber") DO UPDATE SET
      "barcode"          = COALESCE(EXCLUDED."barcode", "Product"."barcode"),
      "description"      = EXCLUDED."description",
      "brand"            = COALESCE(EXCLUDED."brand", "Product"."brand"),
      "supplier"         = COALESCE(EXCLUDED."supplier", "Product"."supplier"),
      "substitutionPart" = COALESCE(EXCLUDED."substitutionPart", "Product"."substitutionPart"),
      "notes"            = COALESCE(EXCLUDED."notes", "Product"."notes"),
      "price"            = EXCLUDED."price",
      "vatRate"          = EXCLUDED."vatRate",
      "stock"            = EXCLUDED."stock",
      "unit"             = EXCLUDED."unit",
      "updatedAt"        = ${now}
    RETURNING (xmax = 0) AS inserted
  `);

  const inserted = result.filter((r) => r.inserted).length;
  return { inserted, updated: result.length - inserted };
}

// Shared batch-processing state passed between helpers.
interface ProcessState {
  jobId: string;
  createdById: string | null;
  mapping: ColumnMapping;
  processedRows: number;
  insertedRows: number;
  updatedRows: number;
  errorRows: number;
  errors: ImportError[];
  lastProgressUpdate: number;
  // Sync: collect every imported productNumber so we can delete the rest.
  importedProductNumbers: Set<string> | null;
}

async function flushBatch(
  validProducts: ValidatedProduct[],
  batchStartRow: number,
  state: ProcessState
): Promise<void> {
  if (validProducts.length === 0) return;
  try {
    const counts = await upsertProductBatch(validProducts, state.createdById);
    state.insertedRows += counts.inserted;
    state.updatedRows += counts.updated;
  } catch (err) {
    for (let k = 0; k < validProducts.length; k++) {
      state.errorRows++;
      if (state.errors.length < MAX_STORED_ERRORS) {
        state.errors.push({
          row: batchStartRow + k,
          message: err instanceof Error ? err.message : "Database error",
        });
      }
    }
  }
}

async function saveProgress(state: ProcessState): Promise<void> {
  await prisma.importJob.update({
    where: { id: state.jobId },
    data: {
      processedRows: state.processedRows,
      insertedRows: state.insertedRows,
      updatedRows: state.updatedRows,
      errorRows: state.errorRows,
      errors: state.errors as unknown as Prisma.JsonArray,
    },
  });
  state.lastProgressUpdate = state.processedRows;
}

// Processes an iterable/array of raw rows in BATCH_SIZE chunks.
// Works for both CSV (async generator) and XLSX (plain array).
async function processRows(
  rows: AsyncIterable<Record<string, string>> | Record<string, string>[],
  totalRows: number,
  state: ProcessState
): Promise<void> {
  let validProducts: ValidatedProduct[] = [];
  let batchStartRow = 2; // 1-based, row 1 is the header

  // Find which CSV header maps to productNumber for sync tracking.
  const productNumberHeader = Object.entries(state.mapping).find(
    ([, v]) => v === "productNumber"
  )?.[0];

  const handleRow = async (rawRow: Record<string, string>) => {
    const rowNumber = state.processedRows + 2;
    const result = mapAndValidateRow(rawRow, state.mapping, rowNumber);

    if ("error" in result) {
      state.errorRows++;
      if (state.errors.length < MAX_STORED_ERRORS)
        state.errors.push(result.error);
    } else {
      validProducts.push(result.product);
    }

    state.processedRows++;

    // Track every product number present in the file (even rows with other
    // errors) so we don't delete a product that merely had a bad price field.
    if (state.importedProductNumbers !== null && productNumberHeader) {
      const pn = (rawRow[productNumberHeader] ?? "").trim();
      if (pn) state.importedProductNumbers.add(pn);
    }

    if (validProducts.length >= BATCH_SIZE) {
      await flushBatch(validProducts, batchStartRow, state);
      batchStartRow = state.processedRows + 2;
      validProducts = [];
      await yieldToEventLoop();
    }

    if (
      state.processedRows - state.lastProgressUpdate >= PROGRESS_EVERY ||
      state.processedRows === totalRows
    ) {
      await saveProgress(state);
    }
  };

  if (Array.isArray(rows)) {
    for (const row of rows) {
      await handleRow(row);
    }
  } else {
    for await (const row of rows) {
      await handleRow(row);
    }
  }

  // Flush the last partial batch
  if (validProducts.length > 0) {
    await flushBatch(validProducts, batchStartRow, state);
    await saveProgress(state);
  }
}

export async function processImportJob(jobId: string): Promise<void> {
  try {
    const job = await prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error(`Job ${jobId} not found`);

    const mapping = job.mapping as ColumnMapping;
    const isCsv = job.filePath.toLowerCase().endsWith(".csv");

    const state: ProcessState = {
      jobId,
      createdById: job.createdById,
      mapping,
      processedRows: 0,
      insertedRows: 0,
      updatedRows: 0,
      errorRows: 0,
      errors: [],
      lastProgressUpdate: 0,
      importedProductNumbers: job.syncMode ? new Set<string>() : null,
    };

    if (isCsv) {
      // Fast non-blocking row count so the UI can show progress %.
      const totalRows = await countCsvRows(job.filePath);
      await prisma.importJob.update({
        where: { id: jobId },
        data: { status: "PROCESSING", totalRows },
      });

      // Stream rows one at a time — no full file in memory.
      await processRows(streamCsvRows(job.filePath), totalRows, state);
    } else {
      // XLSX: must load the whole file. Disable unused cell features
      // to reduce parse time and peak memory usage.
      const allRows = parseXlsxAllRows(job.filePath);
      await prisma.importJob.update({
        where: { id: jobId },
        data: { status: "PROCESSING", totalRows: allRows.length },
      });

      await processRows(allRows, allRows.length, state);
    }

    await unlink(job.filePath).catch(() => {});

    // Sync delete: remove products with matching supplier that were NOT in the file.
    // Guard: only run if we actually collected product numbers to avoid deleting everything.
    let deletedRows = 0;
    if (
      job.syncMode &&
      job.syncSupplier &&
      state.importedProductNumbers &&
      state.importedProductNumbers.size > 0
    ) {
      const importedList = Array.from(state.importedProductNumbers);
      deletedRows = await prisma.$executeRaw`
        DELETE FROM "Product"
        WHERE supplier = ${job.syncSupplier}
        AND "productNumber" != ALL(${importedList}::text[])
      `;
    }

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        processedRows: state.processedRows,
        insertedRows: state.insertedRows,
        updatedRows: state.updatedRows,
        deletedRows,
        errorRows: state.errorRows,
        errors: state.errors as unknown as Prisma.JsonArray,
        completedAt: new Date(),
      },
    });

    revalidateTag("products", { expire: 0 });
    invalidateProductCache();
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
