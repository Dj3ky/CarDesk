"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Search, Loader2, ImageOff, AlertCircle, ChevronDown, ChevronRight, Car, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PartArticle, VinVehicle, VinCategory, ArticleDetail, VehicleDetail } from "../types";
import { ActiveOfferBar, type ActiveOfferInfo } from "./active-offer-bar";

function ArticleCard({ article, activeOffer, onAdded, locale }: {
  article: PartArticle;
  activeOffer: ActiveOfferInfo | null;
  onAdded?: () => void;
  locale: string;
}) {
  const t = useTranslations("partsCatalog");
  const [addOpen, setAddOpen] = useState(false);
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("0");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  // Close lightbox on Escape
  useEffect(() => {
    if (!imageOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setImageOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [imageOpen]);
  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailUnavailable, setDetailUnavailable] = useState(false);

  async function toggleDetail() {
    if (detailOpen) { setDetailOpen(false); return; }
    setDetailOpen(true);
    if (detail || detailUnavailable) return;
    setDetailLoading(true);
    try {
      const res = await fetch("/api/parts-catalog/article-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.articleId, locale }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.articleAllSpecifications || json.articleOemNo) {
          setDetail(json);
        } else {
          setDetailUnavailable(true);
        }
      } else {
        setDetailUnavailable(true);
      }
    } catch {
      setDetailUnavailable(true);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleAdd() {
    if (!activeOffer) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/parts-catalog/open-offers/${activeOffer.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: article.articleProductName || article.articleNo,
          productNumber: article.articleNo,
          quantity: parseFloat(qty) || 1,
          pricePerUnit: parseFloat(price) || 0,
        }),
      });
      if (res.ok) {
        setAdded(true);
        onAdded?.();
        setTimeout(() => {
          setAdded(false);
          setAddOpen(false);
          setQty("1");
          setPrice("0");
        }, 1500);
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="w-20 h-20 shrink-0 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
            {article.s3image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.s3image}
                alt={article.articleNo}
                className="w-full h-full object-contain cursor-zoom-in"
                onClick={() => setImageOpen(true)}
              />
            ) : (
              <ImageOff className="h-8 w-8 text-muted-foreground/30" />
            )}
          </div>

          {imageOpen && article.s3image && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-zoom-out"
              onClick={() => setImageOpen(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.s3image}
                alt={article.articleNo}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          )}
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
          <button
            type="button"
            onClick={toggleDetail}
            className="shrink-0 self-start text-xs text-primary hover:underline flex items-center gap-1"
          >
            {detailLoading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : detailOpen
                ? <ChevronDown className="h-3 w-3" />
                : <ChevronRight className="h-3 w-3" />}
            {t("details")}
          </button>
        </div>

        {detailOpen && detailUnavailable && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            {t("detailUnavailable")}
          </div>
        )}

        {detailOpen && detail && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {(detail.articleOemNo?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  {t("oemNumbers")}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {detail.articleOemNo.map((o, i) => (
                    <span key={i} className="text-xs">
                      <span className="text-muted-foreground">{o.oemBrand}: </span>
                      <span className="font-mono">{o.oemDisplayNo}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(detail.articleAllSpecifications?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  {t("specifications")}
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {detail.articleAllSpecifications.map((s, i) => (
                    <div key={i} className="flex justify-between gap-2 text-xs border-b border-muted py-0.5">
                      <span className="text-muted-foreground">{s.criteriaName}</span>
                      <span className="font-medium text-right">{s.criteriaValue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(detail.articleParts?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  {t("includedParts")} ({detail.articleParts!.length})
                </p>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground w-8">#</th>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">{t("partNumber")}</th>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">{t("partDescription")}</th>
                        <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-10">{t("partQty")}</th>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">{t("partStatus")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {detail.articleParts!.map((p) => {
                        const isDiscontinued = p.articleStatus.toLowerCase().includes("no longer");
                        const isOnDemand = p.articleStatus.toLowerCase().includes("on demand");
                        return (
                          <tr key={p.orderInList} className="hover:bg-muted/30">
                            <td className="px-3 py-1.5 text-muted-foreground">{p.orderInList}</td>
                            <td className="px-3 py-1.5 font-mono">{p.articleNo}</td>
                            <td className="px-3 py-1.5">{p.articleProductName}</td>
                            <td className="px-3 py-1.5 text-center">{p.quantity}</td>
                            <td className={cn("px-3 py-1.5", isDiscontinued ? "text-red-500" : isOnDemand ? "text-amber-500" : "text-green-600")}>
                              {isDiscontinued ? t("statusDiscontinued") : isOnDemand ? t("statusOnDemand") : t("statusNormal")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(detail.articleSelectionCriterias?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  {t("applicationCriteria")}
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {detail.articleSelectionCriterias!.map((s, i) => (
                    <div key={i} className="flex justify-between gap-2 text-xs border-b border-muted py-0.5">
                      <span className="text-muted-foreground">{s.criteriaName}</span>
                      <span className="font-medium text-right">{s.criteriaValue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detail.articleEanNo?.eanNumbers && (
              <p className="text-xs text-muted-foreground">
                EAN: <span className="font-mono">{detail.articleEanNo.eanNumbers}</span>
              </p>
            )}
          </div>
        )}

        {activeOffer && (
          added ? (
            <div className="mt-3 pt-3 border-t flex items-center gap-1.5 text-sm text-green-600">
              <Check className="h-4 w-4" />
              {t("added")}
            </div>
          ) : addOpen ? (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap">
              <label className="text-xs text-muted-foreground">{t("addQty")}</label>
              <Input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                type="number"
                min="0.001"
                step="1"
                className="w-20 h-7 text-sm"
              />
              <label className="text-xs text-muted-foreground">{t("addPrice")}</label>
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                className="w-28 h-7 text-sm"
              />
              <Button size="sm" onClick={handleAdd} disabled={adding} className="h-7">
                {adding && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                {t("addToOffer")}
              </Button>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {t("cancelAdd")}
              </button>
            </div>
          ) : (
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddOpen(true)}
                className="h-7 text-xs gap-1"
              >
                <Plus className="h-3 w-3" />
                {t("addToOffer")}
              </Button>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

function SupplierGroup({ name, articles, open, onToggle, activeOffer, onAdded, locale }: {
  name: string;
  articles: PartArticle[];
  open: boolean;
  onToggle: () => void;
  activeOffer: ActiveOfferInfo | null;
  onAdded?: () => void;
  locale: string;
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
            <ArticleCard
              key={article.articleId}
              article={article}
              activeOffer={activeOffer}
              onAdded={onAdded}
              locale={locale}
            />
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
  const [vehicleDetail, setVehicleDetail] = useState<VehicleDetail | null>(null);
  const [categories, setCategories] = useState<VinCategory[] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<PartArticle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [activeOffer, setActiveOffer] = useState<ActiveOfferInfo | null>(null);

  function handleItemAdded() {
    setActiveOffer((prev) => prev ? { ...prev, itemCount: prev.itemCount + 1 } : null);
  }

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
        setOpenGroups(new Set());
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
    setVehicleDetail(null);
    setCategories(null);
    setCategoryFilter("");
    setSelectedCategoryId(null);
    setArticles(null);
    setCategoriesLoading(true);

    const [categoriesRes, detailRes] = await Promise.allSettled([
      fetch("/api/parts-catalog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.vehicleId, locale }),
      }),
      fetch("/api/parts-catalog/vehicle-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.vehicleId, locale }),
      }),
    ]);

    if (categoriesRes.status === "fulfilled") {
      const json = await categoriesRes.value.json();
      setCategories(json.categories ?? []);
    } else {
      setCategories([]);
    }

    if (detailRes.status === "fulfilled" && detailRes.value.ok) {
      setVehicleDetail(await detailRes.value.json());
    }

    setCategoriesLoading(false);
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
      <ActiveOfferBar activeOffer={activeOffer} onSelect={setActiveOffer} />

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
                      {(() => {
                        // Deduplicate by carName (already includes engine variant)
                        const seen = new Set<string>();
                        const unique = vinVehicles.filter((v) => {
                          if (seen.has(v.carName)) return false;
                          seen.add(v.carName);
                          return true;
                        });
                        const q = vinVehicleFilter.trim().toLowerCase();
                        const filtered = q
                          ? unique.filter((v) => v.carName.toLowerCase().includes(q))
                          : unique;
                        return filtered.map((v) => (
                          <button
                            key={v.vehicleId}
                            type="button"
                            onClick={() => selectVehicle(v)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                              selectedVehicle?.vehicleId === v.vehicleId
                                ? "bg-blue-50 border-l-4 border-blue-500 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                                : "hover:bg-muted border-l-4 border-transparent"
                            )}
                          >
                            <Car className={cn(
                              "h-4 w-4 shrink-0",
                              selectedVehicle?.vehicleId === v.vehicleId ? "text-blue-500" : "text-muted-foreground"
                            )} />
                            <p className="text-sm font-medium truncate">{v.carName}</p>
                          </button>
                        ));
                      })()}
                    </div>

                    {/* Vehicle detail card */}
                    {vehicleDetail && (
                      <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2">
                        <p className="text-sm font-semibold">
                          {vehicleDetail.manufacturerName} {vehicleDetail.modelType}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {vehicleDetail.typeEngineName && <span>{vehicleDetail.typeEngineName}</span>}
                          {vehicleDetail.powerKw && vehicleDetail.powerPs && (
                            <span>{Math.round(parseFloat(vehicleDetail.powerKw))} kW / {Math.round(parseFloat(vehicleDetail.powerPs))} PS</span>
                          )}
                          {vehicleDetail.capacityTech && (
                            <span>{Math.round(parseFloat(vehicleDetail.capacityTech))} cc</span>
                          )}
                          {vehicleDetail.fuelType && <span>{vehicleDetail.fuelType}</span>}
                          {vehicleDetail.bodyType && <span>{vehicleDetail.bodyType}</span>}
                          {vehicleDetail.driveType && <span>{vehicleDetail.driveType}</span>}
                          {vehicleDetail.numberOfCylinders && <span>{vehicleDetail.numberOfCylinders} cyl</span>}
                          {vehicleDetail.fuelMixture && <span>{vehicleDetail.fuelMixture}</span>}
                          {vehicleDetail.engCodes && (
                            <span className="font-mono">Engine: {vehicleDetail.engCodes}</span>
                          )}
                          {vehicleDetail.constructionIntervalStart && (
                            <span>
                              {vehicleDetail.constructionIntervalStart.slice(0, 7).replace("-", "/")}
                              {vehicleDetail.constructionIntervalEnd
                                ? ` – ${vehicleDetail.constructionIntervalEnd.slice(0, 7).replace("-", "/")}`
                                : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

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
                                onClick={() => {
                                  if (!selectedVehicle) return;
                                  setSelectedCategoryId(catId ?? null);
                                  search({ type: "vehicle", vehicleId: selectedVehicle.vehicleId, categoryId: catId });
                                }}
                                className={cn(
                                  "w-full px-4 py-2.5 text-left text-sm transition-colors",
                                  selectedCategoryId === catId && catId != null
                                    ? "bg-blue-50 border-l-4 border-blue-500 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                                    : "hover:bg-muted border-l-4 border-transparent"
                                )}
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
                  activeOffer={activeOffer}
                  onAdded={handleItemAdded}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
