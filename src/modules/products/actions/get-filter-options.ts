"use server";

import { getCachedFilterOptions } from "@/lib/product-cache";
import type { FilterOptions } from "../types";

export type { FilterOptions };

export async function getFilterOptions(): Promise<FilterOptions> {
  return getCachedFilterOptions();
}
