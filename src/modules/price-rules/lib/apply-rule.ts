import type { PriceRule } from "../types";

export function applyRule(
  price: number,
  rule: Pick<PriceRule, "adjustmentType" | "adjustmentValue">
): number {
  const val = parseFloat(rule.adjustmentValue);
  if (rule.adjustmentType === "percent") {
    return price * (1 + val / 100);
  }
  return price + val;
}

// Returns the first matching active rule: brand rules take priority over supplier.
export function findMatchingRule(
  brand: string | null,
  supplier: string | null,
  rules: PriceRule[]
): PriceRule | undefined {
  if (brand) {
    const match = rules.find(
      (r) =>
        r.isActive &&
        r.filterType === "brand" &&
        r.filterValue.toLowerCase() === brand.toLowerCase()
    );
    if (match) return match;
  }
  if (supplier) {
    return rules.find(
      (r) =>
        r.isActive &&
        r.filterType === "supplier" &&
        r.filterValue.toLowerCase() === supplier.toLowerCase()
    );
  }
  return undefined;
}
