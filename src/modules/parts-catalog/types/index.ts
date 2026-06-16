export type PartArticle = {
  articleId: number;
  articleNumber: string;
  mfrName: string;
  mfrId?: number;
  description?: string;
  images?: { imageURL: string }[];
  oemNumbers?: { articleNumber: string; mfrName: string }[];
  attributes?: { attrName: string; attrValue: string; displayUnit?: string }[];
};

export type PartsCatalogSearchType = "oem" | "vehicle";

export type PartsCatalogSearchParams =
  | { type: "oem"; query: string; langId?: number }
  | { type: "vehicle"; typeId: number; langId?: number };

export type PartsCatalogResult = {
  articles: PartArticle[];
  total?: number;
};
