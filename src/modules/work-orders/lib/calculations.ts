export type ItemCalc = {
  subtotal: number;
  discountAmt: number;
  baseNet: number;
  vatAmt: number;
  lineTotal: number;
};

export type LaborCalc = {
  baseNet: number;
  vatAmt: number;
  lineTotal: number;
};

export type WorkOrderTotals = {
  partsSubtotalExVat: number;
  laborSubtotalExVat: number;
  subtotalExVat: number;
  totalDiscount: number;
  vatBreakdown: { rate: number; base: number; amount: number }[];
  totalVat: number;
  grandTotal: number;
};

export function calcItem(item: {
  quantity?: number | string;
  pricePerUnit?: number | string;
  vatRate?: number | string;
  discount?: number | string;
}): ItemCalc {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.pricePerUnit) || 0;
  const vat = Number(item.vatRate) || 0;
  const disc = Number(item.discount) || 0;

  const subtotal = qty * price;
  const discountAmt = subtotal * (disc / 100);
  const baseNet = subtotal - discountAmt;
  const vatAmt = baseNet * (vat / 100);
  const lineTotal = baseNet + vatAmt;

  return { subtotal, discountAmt, baseNet, vatAmt, lineTotal };
}

export function calcLaborItem(item: {
  hours?: number | string;
  hourlyRate?: number | string;
  vatRate?: number | string;
}): LaborCalc {
  const hrs = Number(item.hours) || 0;
  const rate = Number(item.hourlyRate) || 0;
  const vat = Number(item.vatRate) || 0;

  const baseNet = hrs * rate;
  const vatAmt = baseNet * (vat / 100);
  const lineTotal = baseNet + vatAmt;

  return { baseNet, vatAmt, lineTotal };
}

export function calcTotals(
  items: Array<{ quantity?: number | string; pricePerUnit?: number | string; vatRate?: number | string; discount?: number | string }>,
  laborItems: Array<{ hours?: number | string; hourlyRate?: number | string; vatRate?: number | string }>
): WorkOrderTotals {
  const vatMap = new Map<number, { base: number; amount: number }>();
  let partsSubtotalExVat = 0;
  let laborSubtotalExVat = 0;
  let totalDiscount = 0;

  for (const item of items) {
    const { baseNet, vatAmt, discountAmt } = calcItem(item);
    partsSubtotalExVat += baseNet;
    totalDiscount += discountAmt;
    const rate = Number(item.vatRate) || 0;
    const existing = vatMap.get(rate) ?? { base: 0, amount: 0 };
    vatMap.set(rate, { base: existing.base + baseNet, amount: existing.amount + vatAmt });
  }

  for (const labor of laborItems) {
    const { baseNet, vatAmt } = calcLaborItem(labor);
    laborSubtotalExVat += baseNet;
    const rate = Number(labor.vatRate) || 0;
    const existing = vatMap.get(rate) ?? { base: 0, amount: 0 };
    vatMap.set(rate, { base: existing.base + baseNet, amount: existing.amount + vatAmt });
  }

  const vatBreakdown = Array.from(vatMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([rate, { base, amount }]) => ({ rate, base, amount }));

  const totalVat = vatBreakdown.reduce((s, v) => s + v.amount, 0);
  const subtotalExVat = partsSubtotalExVat + laborSubtotalExVat;

  return {
    partsSubtotalExVat,
    laborSubtotalExVat,
    subtotalExVat,
    totalDiscount,
    vatBreakdown,
    totalVat,
    grandTotal: subtotalExVat + totalVat,
  };
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency }).format(amount);
}
