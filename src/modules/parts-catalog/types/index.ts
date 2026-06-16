export type PartArticle = {
  articleId: number;
  articleNo: string;
  articleSearchNo?: string;
  articleProductName?: string;
  manufacturerName?: string;
  manufacturerId?: number;
  // image/OEM fields — names confirmed from API logs
  images?: { imageURL?: string; imageUrl?: string; url?: string }[];
  articleImage?: string;
  imageUrl?: string;
  oemNumbers?: { articleNumber?: string; articleOemNo?: string; mfrName?: string; manufacturerName?: string }[];
  articleOemNumbers?: { articleOemNo: string; manufacturerName?: string }[];
  attributes?: { attrName?: string; criteriaDescription?: string; attrValue?: string; criteriaValue?: string; displayUnit?: string; criteriaUnit?: string }[];
};

export type PartsCatalogSearchType = "oem" | "vehicle";

export type PartsCatalogSearchParams =
  | { type: "oem"; query: string; langId?: number }
  | { type: "vehicle"; typeId: number; langId?: number };

export type PartsCatalogResult = {
  articles: PartArticle[];
};
