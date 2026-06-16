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

export type VinVehicle = {
  manuId: number;
  modelId: number;
  vehicleId: number;
  carName: string;
  vehicleTypeDescription?: string;
  linkageTargetType?: string;
};

export type VinCategory = {
  categoryId: string | number;
  categoryName?: string;
  description?: string;
  assemblyGroupName?: string;
  productGroupId?: string | number;
  productGroupName?: string;
  [key: string]: unknown;
};

export type PartsCatalogSearchParams =
  | { type: "oem"; query: string; langId?: number }
  | { type: "vehicle"; vehicleId: number; langId?: number };
