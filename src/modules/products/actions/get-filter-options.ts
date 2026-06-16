"use server";

import { getCachedFilterOptions } from "@/lib/product-cache";
import type { FilterOptions } from "../types";

export async function getFilterOptions(): Promise<FilterOptions> {
  return getCachedFilterOptions();
}
