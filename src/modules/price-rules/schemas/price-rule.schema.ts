import { z } from "zod";

export const priceRuleSchema = z.object({
  filterType: z.enum(["brand", "supplier"]),
  filterValue: z.string().min(1, "Required"),
  adjustmentType: z.enum(["percent", "fixed"]),
  adjustmentValue: z.number(),
});

export type PriceRuleFormValues = z.infer<typeof priceRuleSchema>;
