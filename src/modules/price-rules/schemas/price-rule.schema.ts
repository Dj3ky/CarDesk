import { z } from "zod";

type TFn = (key: string) => string;

function priceRuleSchemaWith(t: TFn) {
  return z.object({
    filterType: z.enum(["brand", "supplier"]),
    filterValue: z.string().min(1, t("required")),
    adjustmentType: z.enum(["percent", "fixed"]),
    adjustmentValue: z.number(),
  });
}

const englishT: TFn = (key) => {
  const m: Record<string, string> = { required: "Required" };
  return m[key] ?? key;
};

export const priceRuleSchema = priceRuleSchemaWith(englishT);

export function createPriceRuleSchema(t: TFn) {
  return priceRuleSchemaWith(t);
}

export type PriceRuleFormValues = z.infer<typeof priceRuleSchema>;
