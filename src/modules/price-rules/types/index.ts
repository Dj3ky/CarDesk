export type PriceFilterType = "brand" | "supplier";
export type PriceAdjustmentType = "percent" | "fixed";

export type PriceRule = {
  id: string;
  filterType: PriceFilterType;
  filterValue: string;
  adjustmentType: PriceAdjustmentType;
  adjustmentValue: string; // Decimal serialised as string
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
