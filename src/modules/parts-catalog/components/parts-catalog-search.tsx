"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Search, Loader2, ImageOff, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PartArticle } from "../types";

function ArticleCard({ article }: { article: PartArticle }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex gap-4">
        <div className="w-20 h-20 shrink-0 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
          {article.s3image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.s3image}
              alt={article.articleNo}
              className="w-full h-full object-contain"
            />
          ) : (
            <ImageOff className="h-8 w-8 text-muted-foreground/30" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <span className="font-mono font-semibold text-sm">{article.articleNo}</span>
          {article.articleProductName && (
            <p className="text-sm text-muted-foreground">{article.articleProductName}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            {article.articleSearchNo && (
              <span className="font-mono">OEM: {article.articleSearchNo}</span>
            )}
            {article.manufacturerName && (
              <span>Brand: {article.manufacturerName}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SupplierGroup({ name, articles }: { name: string; articles: PartArticle[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="font-semibold text-sm">{name}</span>
          <Badge variant="outline" className="text-xs">{articles.length}</Badge>
        </div>
      </button>
      {open && (
        <div className="divide-y">
          {articles.map((article) => (
            <ArticleCard key={article.articleId} article={article} />
          ))}
        </div>
      )}
    </div>
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
  const [filterText, setFilterText] = useState("");

  async function search(body: object) {
    setLoading(true);
    setError(null);
    setArticles(null);
    setFilterText("");
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

  const grouped = useMemo(() => {
    if (!articles) return null;
    const q = filterText.trim().toLowerCase();
    const filtered = q
      ? articles.filter(
          (a) =>
            a.articleNo?.toLowerCase().includes(q) ||
            a.articleProductName?.toLowerCase().includes(q) ||
            a.supplierName?.toLowerCase().includes(q) ||
            a.articleSearchNo?.toLowerCase().includes(q)
        )
      : articles;

    const map = new Map<string, PartArticle[]>();
    for (const a of filtered) {
      const key = a.supplierName ?? "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return { groups: map, total: filtered.length };
  }, [articles, filterText]);

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

      {grouped !== null && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground shrink-0">
              {t("resultCount", { count: grouped.total })}
            </p>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder={t("filterPlaceholder")}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {grouped.total === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("noResults")}</p>
          ) : (
            <div className="space-y-3">
              {Array.from(grouped.groups.entries()).map(([supplier, items]) => (
                <SupplierGroup key={supplier} name={supplier} articles={items} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
