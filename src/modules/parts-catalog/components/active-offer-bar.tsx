"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ChevronDown, Plus, ExternalLink, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ActiveOfferInfo = {
  id: string;
  offerNumber: string;
  customerName: string;
  itemCount: number;
};

type OfferOption = ActiveOfferInfo;
type CustomerOption = { id: string; name: string };

export function ActiveOfferBar({
  activeOffer,
  onSelect,
}: {
  activeOffer: ActiveOfferInfo | null;
  onSelect: (offer: ActiveOfferInfo) => void;
}) {
  const t = useTranslations("partsCatalog");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [offers, setOffers] = useState<OfferOption[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadOffers() {
    setLoadingOffers(true);
    try {
      const res = await fetch("/api/parts-catalog/open-offers");
      const json = await res.json();
      setOffers(json.offers ?? []);
    } finally {
      setLoadingOffers(false);
    }
  }

  useEffect(() => {
    if (!showNewDialog) return;
    const timer = setTimeout(async () => {
      setLoadingCustomers(true);
      try {
        const res = await fetch(`/api/parts-catalog/customers?q=${encodeURIComponent(customerSearch)}`);
        const json = await res.json();
        setCustomers(json.customers ?? []);
      } finally {
        setLoadingCustomers(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch, showNewDialog]);

  function openDropdown() {
    setDropdownOpen(true);
    loadOffers();
  }

  function openNewDialog() {
    setDropdownOpen(false);
    setShowNewDialog(true);
    setCustomerSearch("");
  }

  async function createOffer(customerId: string) {
    setCreating(true);
    try {
      const res = await fetch("/api/parts-catalog/open-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      if (res.ok) {
        const json = await res.json();
        onSelect(json);
        setShowNewDialog(false);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 rounded-lg border">
        <span className="text-sm font-medium text-muted-foreground shrink-0">
          {t("activeOffer")}:
        </span>

        <div className="relative flex-1 max-w-sm" ref={dropdownRef}>
          <button
            type="button"
            onClick={openDropdown}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm border rounded-md bg-background hover:bg-muted transition-colors"
          >
            <span className="truncate">
              {activeOffer
                ? `${activeOffer.offerNumber} – ${activeOffer.customerName}`
                : t("selectOffer")}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>

          {dropdownOpen && (
            <div className="absolute z-50 top-full mt-1 w-full min-w-[300px] bg-background border rounded-md shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={openNewDialog}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors border-b"
              >
                <Plus className="h-4 w-4" />
                {t("newOffer")}
              </button>

              {loadingOffers ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("loading")}
                </div>
              ) : offers.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">{t("noOpenOffers")}</p>
              ) : (
                <div className="max-h-52 overflow-y-auto divide-y">
                  {offers.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => { onSelect(o); setDropdownOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left",
                        activeOffer?.id === o.id && "bg-blue-50 dark:bg-blue-950"
                      )}
                    >
                      <span className="font-medium shrink-0">{o.offerNumber}</span>
                      <span className="text-muted-foreground truncate flex-1">{o.customerName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {t("itemsInOffer", { count: o.itemCount })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {activeOffer && (
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-muted-foreground">
              {t("itemsInOffer", { count: activeOffer.itemCount })}
            </span>
            <Link
              href={`/offers/${activeOffer.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {t("goToOffer")}
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      {showNewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">{t("newOfferTitle")}</h3>
              <button
                type="button"
                onClick={() => setShowNewDialog(false)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder={t("searchCustomer")}
                  className="pl-9"
                  autoFocus
                />
              </div>

              {loadingCustomers ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : customers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {t("noCustomers")}
                </p>
              ) : (
                <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={creating}
                      onClick={() => createOffer(c.id)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {creating && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
