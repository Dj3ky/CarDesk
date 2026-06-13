import "server-only";
import * as XLSX from "xlsx";
import { createInterface } from "readline";
import { createReadStream } from "fs";

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
