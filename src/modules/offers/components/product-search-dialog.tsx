"use client";

import { useState, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchProductsForOffer } from "../actions/search-products";
import type { ProductSearchResult } from "../types";

interface ProductSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (product: ProductSearchResult) => void;
}

export function ProductSearchDialog({
  open,
  onClose,
  onSelect,
}: ProductSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch() {
    if (!query.trim()) return;
    startTransition(async () => {
      const found = await searchProductsForOffer(query.trim());
      setResults(found);
      setSearched(true);
    });
  }

  function handleSelect(product: ProductSearchResult) {
    onSelect(product);
    onClose();
    setQuery("");
    setResults([]);
    setSearched(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setQuery("");
          setResults([]);
          setSearched(false);
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Search Product Catalog</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Product number or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            autoFocus
          />
          <Button onClick={handleSearch} disabled={!query.trim() || isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {searched && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No products found.
          </p>
        )}

        {results.length > 0 && (
          <div className="divide-y rounded-md border max-h-72 overflow-y-auto">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className="w-full px-4 py-3 text-left hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{p.productNumber}</p>
                    <p className="text-sm font-medium truncate">{p.description}</p>
                    {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">
                      {parseFloat(p.price).toFixed(2)} {" "}
                      <span className="text-xs font-normal text-muted-foreground">ex VAT</span>
                    </p>
                    <p className="text-xs text-muted-foreground">VAT {p.vatRate}%</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
