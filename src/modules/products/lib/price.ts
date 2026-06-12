export function priceExVat(price: string): number {
  return parseFloat(price);
}

export function priceIncVat(price: string, vatRate: string): number {
  return parseFloat(price) * (1 + parseFloat(vatRate) / 100);
}

export function formatEur(value: number, locale = "sl-SI"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
