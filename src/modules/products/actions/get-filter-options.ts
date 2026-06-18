"use server";

import { auth } from "@/lib/auth";
import { getCachedFilterOptions } from "@/lib/product-cache";
import type { FilterOptions } from "../types";

export async function getFilterOptions(): Promise<FilterOptions> {
  const session = await auth();
  if (!session?.user?.id) return { brands: [], suppliers: [] };
  return getCachedFilterOptions();
}
