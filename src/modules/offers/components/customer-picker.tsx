"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Car, ChevronsUpDown, Phone, Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MOBILE_FULLSCREEN_DIALOG } from "../lib/mobile-dialog";
import type { CustomerOption, VehicleOption } from "../types";

const MAX_RESULTS = 50;

/** Lowercase and strip spaces/dashes so "LJ 12-34A" matches "lj1234a". */
function norm(s: string | null | undefined) {
  return (s ?? "").toLowerCase().replace(/[\s\-.]/g, "");
}

export function customerDisplayName(c: Pick<CustomerOption, "firstName" | "lastName" | "companyName">) {
  const person = `${c.lastName}, ${c.firstName}`;
  return c.companyName ? `${c.companyName} (${person})` : person;
}

type Match = { customer: CustomerOption; vehicle?: VehicleOption };

interface CustomerPickerProps {
  id?: string;
  customers: CustomerOption[];
  value: string;
  invalid?: boolean;
  onSelect: (customerId: string, vehicleId?: string) => void;
  onQuickCreate: () => void;
}

export function CustomerPicker({ id, customers, value, invalid, onSelect, onQuickCreate }: CustomerPickerProps) {
  const t = useTranslations("offers");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = customers.find((c) => c.id === value) ?? null;

  const matches = useMemo<Match[]>(() => {
    const q = norm(query);
    if (!q) return customers.slice(0, MAX_RESULTS).map((customer) => ({ customer }));

    const out: Match[] = [];
    for (const c of customers) {
      // A plate hit is the most specific — show it as "customer + car".
      const plateHits = (c.vehicles ?? []).filter((v) => norm(v.registrationPlate).includes(q));
      for (const v of plateHits) out.push({ customer: c, vehicle: v });
      if (plateHits.length > 0) continue;

      const hay = [c.firstName, c.lastName, `${c.firstName}${c.lastName}`, `${c.lastName}${c.firstName}`, c.companyName, c.phone]
        .map(norm)
        .join("|");
      if (hay.includes(q)) out.push({ customer: c });
      if (out.length >= MAX_RESULTS) break;
    }
    return out.slice(0, MAX_RESULTS);
  }, [customers, query]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function pick(m: Match) {
    onSelect(m.customer.id, m.vehicle?.id);
    close();
  }

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-base focus:outline-none focus:ring-1 focus:ring-ring sm:h-9 sm:text-sm",
          invalid && "border-destructive"
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? customerDisplayName(selected) : t("form.selectCustomer")}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className={cn(MOBILE_FULLSCREEN_DIALOG, "gap-3 sm:max-w-lg")}>
          <DialogHeader>
            <DialogTitle>{t("customerPicker.title")}</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("customerPicker.placeholder")}
              className="h-11 pl-9 pr-9 text-base sm:h-9 sm:text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border sm:max-h-[50vh] sm:flex-none">
            {matches.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("customerPicker.noResults")}</p>
            ) : (
              <ul className="divide-y">
                {matches.map((m) => (
                  <li key={`${m.customer.id}-${m.vehicle?.id ?? ""}`}>
                    <button
                      type="button"
                      onClick={() => pick(m)}
                      className={cn(
                        "w-full px-4 py-3 text-left transition-colors hover:bg-accent active:bg-accent",
                        m.customer.id === value && !m.vehicle && "bg-primary/5"
                      )}
                    >
                      <p className="text-sm font-medium">{customerDisplayName(m.customer)}</p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {m.vehicle && (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <Car className="h-3 w-3" />
                            <span className="font-mono">{m.vehicle.registrationPlate}</span>
                            <span className="font-normal text-muted-foreground">
                              {m.vehicle.make} {m.vehicle.model}
                            </span>
                          </span>
                        )}
                        {m.customer.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {m.customer.phone}
                          </span>
                        )}
                        {!m.vehicle && (m.customer.vehicles?.length ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            {m.customer.vehicles!
                              .map((v) => v.registrationPlate)
                              .filter(Boolean)
                              .slice(0, 3)
                              .join(", ")}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 sm:h-9"
            onClick={() => {
              close();
              onQuickCreate();
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {t("form.quickCreate")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
