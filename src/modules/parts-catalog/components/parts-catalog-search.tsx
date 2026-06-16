"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Loader2, ImageOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PartArticle } from "../types";

function ArticleCard({ article }: { article: PartArticle }) {
  const imageUrl =
    article.articleImage ??
    article.imageUrl ??
    article.images?.[0]?.imageURL ??
    article.images?.[0]?.imageUrl ??
    article.images?.[0]?.url;

  const oemList =
    article.articleOemNumbers ??
    article.oemNumbers?.map((o) => ({
      articleOemNo: o.articleOemNo ?? o.articleNumber ?? "",
      manufacturerName: o.manufacturerName ?? o.mfrName,
    }));

  const attrList = article.attributes?.map((a) => ({
    name: a.attrName ?? a.criteriaDescription ?? "",
    value: a.attrValue ?? a.criteriaValue ?? "",
    unit: a.displayUnit ?? a.criteriaUnit ?? "",
  }));

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex gap-4">
        <div className="w-20 h-20 shrink-0 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={article.articleNo}
              className="w-full h-full object-contain"
            />
          ) : (
            <ImageOff className="h-8 w-8 text-muted-foreground/30" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold text-sm">{article.articleNo}</span>
            {article.manufacturerName && (
              <Badge variant="secondary">{article.manufacturerName}</Badge>
            )}
          </div>
          {article.articleProductName && (
            <p className="text-sm text-muted-foreground line-clamp-2">{article.articleProductName}</p>
          )}
          {article.articleSearchNo && article.articleSearchNo !== article.articleNo && (
            <p className="text-xs text-muted-foreground font-mono">OEM: {article.articleSearchNo}</p>
          )}
          {oemList && oemList.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {oemList.slice(0, 4).map((oem, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 bg-muted rounded font-mono">
                  {oem.manufacturerName ? `${oem.manufacturerName}: ` : ""}{oem.articleOemNo}
                </span>
              ))}
              {oemList.length > 4 && (
                <span className="text-xs text-muted-foreground">+{oemList.length - 4} more</span>
              )}
            </div>
          )}
          {attrList && attrList.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 pt-1">
              {attrList.slice(0, 6).map((attr, i) => (
                <span key={i} className="text-xs text-muted-foreground">
                  <span className="font-medium">{attr.name}:</span> {attr.value}{attr.unit ? ` ${attr.unit}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PartsCatalogSearch() {
  const t = useTranslations("partsCatalog");

  const [activeTab, setActiveTab] = useState<"oem" | "vehicle">("oem");
  const [oemQuery, setOemQuery] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<PartArticle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search(body: object) {
    setLoading(true);
    setError(null);
    setArticles(null);
    try {
      const res = await fetch("/api/parts-catalog/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? t("searchError"));
      } else {
        setArticles(json.articles ?? []);
      }
    } catch {
      setError(t("searchError"));
    } finally {
      setLoading(false);
    }
  }

  function searchByOem(e: React.FormEvent) {
    e.preventDefault();
    if (!oemQuery.trim()) return;
    search({ type: "oem", query: oemQuery.trim() });
  }

  function searchByVehicle(e: React.FormEvent) {
    e.preventDefault();
    const id = parseInt(vehicleTypeId);
    if (!id) return;
    search({ type: "vehicle", typeId: id });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Tab switcher */}
        <div className="flex gap-1 border-b">
          {(["oem", "vehicle"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t(tab === "oem" ? "tabOem" : "tabVehicle")}
            </button>
          ))}
        </div>

        {activeTab === "oem" && (
          <div>
            <form onSubmit={searchByOem} className="flex gap-2">
              <Input
                value={oemQuery}
                onChange={(e) => setOemQuery(e.target.value)}
                placeholder={t("oemPlaceholder")}
                className="font-mono max-w-xs"
              />
              <Button type="submit" disabled={loading || !oemQuery.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {t("searchButton")}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">{t("oemHint")}</p>
          </div>
        )}

        {activeTab === "vehicle" && (
          <div>
            <form onSubmit={searchByVehicle} className="flex gap-2">
              <Input
                value={vehicleTypeId}
                onChange={(e) => setVehicleTypeId(e.target.value)}
                placeholder={t("vehicleTypeIdPlaceholder")}
                type="number"
                className="max-w-xs"
              />
              <Button type="submit" disabled={loading || !vehicleTypeId}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {t("searchButton")}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">{t("vehicleHint")}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {articles !== null && (
        <div className="space-y-3">
          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("noResults")}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t("resultCount", { count: articles.length })}
              </p>
              {articles.map((article) => (
                <ArticleCard key={article.articleId} article={article} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
