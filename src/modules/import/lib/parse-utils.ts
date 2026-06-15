// Browser-safe utilities — no Node.js imports.
import type { ColumnMapping, ValidatedProduct, ImportError } from "../types";

export function autoMapColumns(headers: string[]): ColumnMapping {
  const patterns: Record<string, RegExp> = {
    productNumber: /sifra|product.?num|sku|artikl|artikel|art[._-]?no|part.?no/i,
    barcode: /barcode|ean|črtna|upc|gtin/i,
    description: /desc|opis|naziv|name|ime|artikel.?naziv/i,
    brand: /brand|znamka|marka|make/i,
    supplier: /supplier|dobavitel|vendor|lieferant/i,
    price: /^price$|^cena$|preis|cen[ae]|price.?ex|cena.?brez/i,
    vatRate: /vat|ddv|davek|tax.?rate|mwst/i,
    stock: /stock|zaloga|qty|quantity|koli[cč]/i,
    unit: /^unit$|enota|^um$|^uom$/i,
    substitutionPart: /substit|nadomest|replacement|repl[._-]?part|alt[._-]?part/i,
    notes: /^notes?$|^opomba$|^opombe$|remark|comment|intern/i,
  };

  const mapping: ColumnMapping = {};
  const used = new Set<string>();

  for (const header of headers) {
    for (const [field, pattern] of Object.entries(patterns)) {
      if (!used.has(field) && pattern.test(header)) {
        mapping[header] = field;
        used.add(field);
        break;
      }
    }
  }

  return mapping;
}

export function mapAndValidateRow(
  rawRow: Record<string, string>,
  mapping: ColumnMapping,
  rowNumber: number
): { product: ValidatedProduct } | { error: ImportError } {
  const get = (field: string): string => {
    const header = Object.entries(mapping).find(([, v]) => v === field)?.[0];
    return header ? (rawRow[header] ?? "").trim() : "";
  };

  const productNumber = get("productNumber");
  if (!productNumber)
    return { error: { row: rowNumber, message: "Missing product number" } };
  if (productNumber.length > 100)
    return {
      error: {
        row: rowNumber,
        message: `Product number too long (max 100 chars)`,
      },
    };

  const description = get("description");
  if (!description)
    return { error: { row: rowNumber, message: "Missing description" } };

  const priceStr = get("price");
  const price = parseFloat(priceStr.replace(",", "."));
  if (!priceStr || isNaN(price) || price < 0)
    return {
      error: { row: rowNumber, message: `Invalid price: "${priceStr}"` },
    };

  const vatRateStr = get("vatRate");
  const vatRate = vatRateStr ? parseFloat(vatRateStr.replace(",", ".")) : 22;
  if (isNaN(vatRate) || vatRate < 0 || vatRate > 100)
    return {
      error: {
        row: rowNumber,
        message: `Invalid VAT rate: "${vatRateStr}"`,
      },
    };

  const stockStr = get("stock");
  const stock = stockStr ? parseInt(stockStr, 10) : 0;

  const barcode = get("barcode") || null;
  const brand = get("brand") || null;
  const supplier = get("supplier") || null;
  const unit = (get("unit") || "pcs").substring(0, 10);
  const substitutionPart = get("substitutionPart") || null;
  const notes = get("notes") || null;

  return {
    product: {
      productNumber,
      barcode: barcode && barcode.length <= 100 ? barcode : null,
      description: description.substring(0, 500),
      brand: brand ? brand.substring(0, 100) : null,
      supplier: supplier ? supplier.substring(0, 100) : null,
      substitutionPart:
        substitutionPart && substitutionPart.length <= 100
          ? substitutionPart
          : null,
      notes: notes || null,
      price,
      vatRate,
      stock: isNaN(stock) ? 0 : Math.max(0, stock),
      unit,
    },
  };
}
