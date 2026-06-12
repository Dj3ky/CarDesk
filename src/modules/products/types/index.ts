import type { Product } from "@prisma/client";

// Serialisable subset used in list views (Decimal → string for RSC boundary)
export type ProductListItem = {
  id: string;
  productNumber: string;
  barcode: string | null;
  description: string;
  brand: string | null;
  supplier: string | null;
  price: string;       // Decimal serialised as string
  vatRate: string;     // Decimal serialised as string
  stock: number;
  unit: string;
  isActive: boolean;
};

export type ProductDetail = Omit<Product, "price" | "vatRate"> & {
  price: string;
  vatRate: string;
  createdBy: { id: string; name: string | null; email: string } | null;
};

export type FilterOptions = {
  brands: string[];
  suppliers: string[];
};

export type ProductListResult = {
  products: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ProductFilters = {
  search?: string;
  brand?: string;
  supplier?: string;
  minPrice?: number;
  maxPrice?: number;
  showInactive?: boolean;
};

export type ActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
