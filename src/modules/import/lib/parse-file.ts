import * as XLSX from "xlsx";
import { createInterface } from "readline";
import { createReadStream } from "fs";
import type { ColumnMapping, ValidatedProduct, ImportError } from "../types";

export type PreviewResult = {
  headers: string[];
  preview: Record<string, string>[];
  totalRows: number;
};

// Only reads header + first 5 rows. Fast even for 500 MB files.
// totalRows is 0 (unknown) — the background job sets it after counting.
export function parseFilePreview(filePath: string): PreviewResult {
  const wb = XLSX.readFile(filePath, { sheetRows: 6 });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const allRows = XLSX.utils.sheet_to_json<string[]>(ws, {
    header: 1,
    defval: "",
  });

  if (allRows.length === 0) return { headers: [], preview: [], totalRows: 0 };

  const headers = allRows[0]
    .map((h) => String(h ?? "").trim())
    .filter(Boolean);
  const dataRows = allRows.slice(1).filter((row) =>
    row.some((cell) => String(cell ?? "").trim() !== "")
  );

  const preview = dataRows.slice(0, 5).map((row) =>
    Object.fromEntries(headers.map((h, i) => [h, String(row[i] ?? "").trim()]))
  );

  return { headers, preview, totalRows: 0 };
}

// XLSX only — loads entire file into memory. Use only in background jobs.
export function parseXlsxAllRows(filePath: string): Record<string, string>[] {
  const wb = XLSX.readFile(filePath, {
    cellFormula: false,
    cellHTML: false,
    cellNF: false,
    cellStyles: false,
    cellDates: false,
  });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const allRows = XLSX.utils.sheet_to_json<string[]>(ws, {
    header: 1,
    defval: "",
  });

  if (allRows.length < 2) return [];

  const headers = allRows[0]
    .map((h) => String(h ?? "").trim())
    .filter(Boolean);

  return allRows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) =>
      Object.fromEntries(
        headers.map((h, i) => [h, String(row[i] ?? "").trim()])
      )
    );
}

// Stream count CSV rows (non-blocking, I/O only).
export async function countCsvRows(filePath: string): Promise<number> {
  let count = -1; // header row doesn't count
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line.trim()) count++;
  }
  return Math.max(0, count);
}

// Auto-detect delimiter from the header line.
function detectDelimiter(line: string): string {
  const counts = {
    ",": (line.match(/,/g) ?? []).length,
    ";": (line.match(/;/g) ?? []).length,
    "\t": (line.match(/\t/g) ?? []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// Async generator — yields one mapped row at a time without loading the file.
export async function* streamCsvRows(
  filePath: string
): AsyncGenerator<Record<string, string>> {
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  let headers: string[] | null = null;
  let delimiter = ",";

  for await (const rawLine of rl) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim()) continue;

    if (headers === null) {
      delimiter = detectDelimiter(line);
      headers = parseCsvLine(line, delimiter);
      continue;
    }

    const values = parseCsvLine(line, delimiter);
    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = values[i] ?? "";
    }
    yield row;
  }
}

// Attempt to auto-map column headers to product fields
export function autoMapColumns(headers: string[]): ColumnMapping {
  const patterns: Record<string, RegExp> = {
    productNumber: /sifra|product.?num|sku|artikl|artikel|art[._-]?no|part.?no/i,
    barcode: /barcode|ean|črtna|upc|gtin/i,
    description: /desc|opis|naziv|name|ime|artikel.?naziv/i,
    brand: /brand|znamka|marka|make/i,
    supplier: /supplier|dobavitel|vendor|lieferant/i,
    price: /^price$|^cena$|preis|cen[ae]|price.?ex|cena.?brez/i,
    vatRate: /vat|ddv|davek|tax.?rate|mwst/i,
    stock: /stock|zaloga|qty|quantity|koli[cč]/i,
    unit: /^unit$|enota|^um$|^uom$/i,
    substitutionPart: /substit|nadomest|replacement|repl[._-]?part|alt[._-]?part/i,
  };

  const mapping: ColumnMapping = {};
  const used = new Set<string>();

  for (const header of headers) {
    for (const [field, pattern] of Object.entries(patterns)) {
      if (!used.has(field) && pattern.test(header)) {
        mapping[header] = field;
        used.add(field);
        break;
      }
    }
  }

  return mapping;
}

export function mapAndValidateRow(
  rawRow: Record<string, string>,
  mapping: ColumnMapping,
  rowNumber: number
): { product: ValidatedProduct } | { error: ImportError } {
  const get = (field: string): string => {
    const header = Object.entries(mapping).find(([, v]) => v === field)?.[0];
    return header ? (rawRow[header] ?? "").trim() : "";
  };

  const productNumber = get("productNumber");
  if (!productNumber)
    return { error: { row: rowNumber, message: "Missing product number" } };
  if (productNumber.length > 100)
    return {
      error: {
        row: rowNumber,
        message: `Product number too long (max 100 chars)`,
      },
    };

  const description = get("description");
  if (!description)
    return { error: { row: rowNumber, message: "Missing description" } };

  const priceStr = get("price");
  const price = parseFloat(priceStr.replace(",", "."));
  if (!priceStr || isNaN(price) || price < 0)
    return {
      error: { row: rowNumber, message: `Invalid price: "${priceStr}"` },
    };

  const vatRateStr = get("vatRate");
  const vatRate = vatRateStr ? parseFloat(vatRateStr.replace(",", ".")) : 22;
  if (isNaN(vatRate) || vatRate < 0 || vatRate > 100)
    return {
      error: {
        row: rowNumber,
        message: `Invalid VAT rate: "${vatRateStr}"`,
      },
    };

  const stockStr = get("stock");
  const stock = stockStr ? parseInt(stockStr, 10) : 0;

  const barcode = get("barcode") || null;
  const brand = get("brand") || null;
  const supplier = get("supplier") || null;
  const unit = (get("unit") || "pcs").substring(0, 10);
  const substitutionPart = get("substitutionPart") || null;

  return {
    product: {
      productNumber,
      barcode: barcode && barcode.length <= 100 ? barcode : null,
      description: description.substring(0, 500),
      brand: brand ? brand.substring(0, 100) : null,
      supplier: supplier ? supplier.substring(0, 100) : null,
      substitutionPart:
        substitutionPart && substitutionPart.length <= 100
          ? substitutionPart
          : null,
      price,
      vatRate,
      stock: isNaN(stock) ? 0 : Math.max(0, stock),
      unit,
    },
  };
}
