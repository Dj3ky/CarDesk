export type PartArticle = {
  articleId: number;
  articleNo: string;
  articleSearchNo?: string;
  articleProductName?: string;
  manufacturerId?: number;
  manufacturerName?: string;
  supplierId?: number;
  supplierName?: string;
  articleMediaType?: string;
  articleMediaFileName?: string;
  s3image?: string;
};

export type PartsCatalogSearchParams =
  | { type: "oem"; query: string; langId?: number }
  | { type: "vehicle"; typeId: number; langId?: number };
