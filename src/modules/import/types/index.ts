export type ImportError = {
  row: number;
  message: string;
};

export type ImportJobStatus = {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  filename: string;
  totalRows: number;
  processedRows: number;
  insertedRows: number;
  updatedRows: number;
  errorRows: number;
  errors: ImportError[];
  createdAt: Date;
  completedAt: Date | null;
};

export type UploadResult = {
  jobId: string;
  headers: string[];
  preview: Record<string, string>[];
  totalRows: number;
};

// All mappable product fields
export const PRODUCT_FIELDS = [
  { key: "productNumber", required: true },
  { key: "barcode", required: false },
  { key: "description", required: true },
  { key: "brand", required: false },
  { key: "supplier", required: false },
  { key: "price", required: true },
  { key: "vatRate", required: false },
  { key: "stock", required: false },
  { key: "unit", required: false },
] as const;

export type ProductFieldKey = (typeof PRODUCT_FIELDS)[number]["key"];

// Column header → product field key (empty string = skip)
export type ColumnMapping = Record<string, string>;

export type ValidatedProduct = {
  productNumber: string;
  barcode: string | null;
  description: string;
  brand: string | null;
  supplier: string | null;
  price: number;
  vatRate: number;
  stock: number;
  unit: string;
};
