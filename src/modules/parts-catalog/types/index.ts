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
  level?: number;
  categoryName1?: string | null;
  categoryId1?: number | null;
  categoryName2?: string | null;
  categoryId2?: number | null;
  categoryName3?: string | null;
  categoryId3?: number | null;
  categoryName4?: string | null;
  categoryId4?: number | null;
};

export type ArticleDetail = {
  articleAllSpecifications: { criteriaName: string; criteriaValue: string }[];
  articleOemNo: { oemBrand: string; oemDisplayNo: string }[];
  articleEanNo?: { eanNumbers: string };
};

export type PartsCatalogSearchParams =
  | { type: "oem"; query: string; langId?: number }
  | { type: "vehicle"; vehicleId: number; langId?: number };
