"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Search, Loader2, ImageOff, AlertCircle, ChevronDown, ChevronRight, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PartArticle, VinVehicle, VinCategory } from "../types";

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

function SupplierGroup({ name, articles, open, onToggle }: {
  name: string;
  articles: PartArticle[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
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

export function PartsCatalogSearch({ locale }: { locale: string }) {
  const t = useTranslations("partsCatalog");

  const [activeTab, setActiveTab] = useState<"oem" | "vehicle" | "vin">("oem");
  const [oemQuery, setOemQuery] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [vinQuery, setVinQuery] = useState("");
  const [vinLoading, setVinLoading] = useState(false);
  const [vinVehicles, setVinVehicles] = useState<VinVehicle[] | null>(null);
  const [vinError, setVinError] = useState<string | null>(null);
  const [vinVehicleFilter, setVinVehicleFilter] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<VinVehicle | null>(null);
  const [categories, setCategories] = useState<VinCategory[] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<PartArticle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  async function search(body: object) {
    setLoading(true);
    setError(null);
    setArticles(null);
    setFilterText("");
    try {
      const res = await fetch("/api/parts-catalog/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, locale }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? t("searchError"));
      } else {
        const list: PartArticle[] = json.articles ?? [];
        setArticles(list);
        const suppliers = new Set(list.map((a) => a.supplierName ?? "Unknown"));
        setOpenGroups(suppliers);
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

  async function searchByVin(e: React.FormEvent) {
    e.preventDefault();
    if (!vinQuery.trim()) return;
    setVinLoading(true);
    setVinError(null);
    setVinVehicles(null);
    setVinVehicleFilter("");
    setSelectedVehicle(null);
    setCategories(null);
    setArticles(null);
    try {
      const res = await fetch("/api/parts-catalog/vin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin: vinQuery.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setVinError(json.error ?? t("searchError"));
      } else {
        setVinVehicles(json.vehicles ?? []);
      }
    } catch {
      setVinError(t("searchError"));
    } finally {
      setVinLoading(false);
    }
  }

  async function selectVehicle(vehicle: VinVehicle) {
    setSelectedVehicle(vehicle);
    setCategories(null);
    setCategoryFilter("");
    setArticles(null);
    setCategoriesLoading(true);
    try {
      const res = await fetch("/api/parts-catalog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.vehicleId, locale }),
      });
      const json = await res.json();
      setCategories(json.categories ?? []);
    } catch {
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
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
          {(["oem", "vin", "vehicle"] as const).map((tab) => (
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
              {tab === "oem" ? t("tabOem") : tab === "vin" ? t("tabVin") : t("tabVehicle")}
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

        {activeTab === "vin" && (
          <div>
            <form onSubmit={searchByVin} className="flex gap-2">
              <Input
                value={vinQuery}
                onChange={(e) => setVinQuery(e.target.value.toUpperCase())}
                placeholder={t("vinPlaceholder")}
                className="font-mono max-w-xs"
                maxLength={17}
              />
              <Button type="submit" disabled={vinLoading || vinQuery.trim().length < 11}>
                {vinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {t("searchButton")}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">{t("vinHint")}</p>

            {vinError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive mt-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {vinError}
              </div>
            )}

            {vinVehicles !== null && (
              <div className="mt-4 space-y-3">
                {vinVehicles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">{t("noResults")}</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground shrink-0">
                        {t("vinMatchCount", { count: vinVehicles.length })}
                      </p>
                      <div className="relative max-w-xs w-full">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          value={vinVehicleFilter}
                          onChange={(e) => setVinVehicleFilter(e.target.value)}
                          placeholder={t("filterPlaceholder")}
                          className="pl-8 h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="rounded-lg border divide-y max-h-72 overflow-y-auto">
                      {vinVehicles
                        .filter((v) =>
                          !vinVehicleFilter.trim() ||
                          v.carName.toLowerCase().includes(vinVehicleFilter.toLowerCase()) ||
                          v.vehicleTypeDescription?.toLowerCase().includes(vinVehicleFilter.toLowerCase())
                        )
                        .map((v) => (
                          <button
                            key={v.vehicleId}
                            type="button"
                            onClick={() => selectVehicle(v)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors",
                              selectedVehicle?.vehicleId === v.vehicleId && "bg-muted"
                            )}
                          >
                            <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{v.carName}</p>
                              {v.vehicleTypeDescription && (
                                <p className="text-xs text-muted-foreground">{v.vehicleTypeDescription}</p>
                              )}
                            </div>
                          </button>
                        ))}
                    </div>

                    {/* Category picker */}
                    {categoriesLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("loadingCategories")}
                      </div>
                    )}

                    {categories !== null && categories.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-medium shrink-0">{t("selectCategory")}</p>
                          <div className="relative max-w-xs w-full">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <Input
                              value={categoryFilter}
                              onChange={(e) => setCategoryFilter(e.target.value)}
                              placeholder={t("filterPlaceholder")}
                              className="pl-8 h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="rounded-lg border divide-y max-h-64 overflow-y-auto">
                          {categories
                            .map((c) => {
                              const catId = c.categoryId4 ?? c.categoryId3 ?? c.categoryId2 ?? c.categoryId1;
                              const parts = [c.categoryName1, c.categoryName2, c.categoryName3, c.categoryName4].filter(Boolean);
                              const name = parts.join(" › ");
                              return { catId, name };
                            })
                            .filter(({ name }) =>
                              !categoryFilter.trim() || name.toLowerCase().includes(categoryFilter.toLowerCase())
                            )
                            .map(({ catId, name }, i) => (
                              <button
                                key={`${catId}-${i}`}
                                type="button"
                                onClick={() => selectedVehicle && search({ type: "vehicle", vehicleId: selectedVehicle.vehicleId, categoryId: catId })}
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors"
                              >
                                {name}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {categories !== null && categories.length === 0 && (
                      <p className="text-sm text-muted-foreground py-2">{t("noCategories")}</p>
                    )}
                  </>
                )}
              </div>
            )}
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const allKeys = Array.from(grouped.groups.keys());
                  const allOpen = allKeys.every((k) => openGroups.has(k));
                  setOpenGroups(allOpen ? new Set() : new Set(allKeys));
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 underline underline-offset-2"
              >
                {Array.from(grouped.groups.keys()).every((k) => openGroups.has(k))
                  ? t("collapseAll")
                  : t("expandAll")}
              </button>
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
          </div>

          {grouped.total === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("noResults")}</p>
          ) : (
            <div className="space-y-3">
              {Array.from(grouped.groups.entries()).map(([supplier, items]) => (
                <SupplierGroup
                  key={supplier}
                  name={supplier}
                  articles={items}
                  open={openGroups.has(supplier)}
                  onToggle={() => setOpenGroups((prev) => {
                    const next = new Set(prev);
                    next.has(supplier) ? next.delete(supplier) : next.add(supplier);
                    return next;
                  })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
