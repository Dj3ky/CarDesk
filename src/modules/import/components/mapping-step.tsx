"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { autoMapColumns } from "../lib/parse-utils";
import { PRODUCT_FIELDS, type ColumnMapping } from "../types";

interface MappingStepProps {
  jobId: string;
  headers: string[];
  preview: Record<string, string>[];
  totalRows: number;
  onComplete: () => void;
  onBack: () => void;
}

export function MappingStep({
  jobId,
  headers,
  preview,
  totalRows,
  onComplete,
  onBack,
}: MappingStepProps) {
  const t = useTranslations();
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [syncMode, setSyncMode] = useState(false);
  const [syncSupplier, setSyncSupplier] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMapping(autoMapColumns(headers));
  }, [headers]);

  // When supplier column gets mapped or unmapped, auto-fill the supplier scope
  // from the first preview row so the user doesn't have to type it.
  useEffect(() => {
    const supplierHeader = Object.entries(mapping).find(
      ([, v]) => v === "supplier"
    )?.[0];
    if (supplierHeader) {
      const sample = preview[0]?.[supplierHeader]?.trim();
      if (sample) setSyncSupplier(sample);
    }
  }, [mapping, preview]);

  const requiredFields = PRODUCT_FIELDS.filter((f) => f.required).map(
    (f) => f.key
  );
  const mappedValues = Object.values(mapping).filter(Boolean);
  const missingRequired = requiredFields.filter(
    (f) => !mappedValues.includes(f)
  );

  const canStart =
    missingRequired.length === 0 &&
    (!syncMode || syncSupplier.trim().length > 0);

  async function handleStartImport() {
    if (!canStart) return;
    setIsStarting(true);
    setError(null);

    try {
      const res = await fetch(`/api/import/start/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapping,
          syncMode,
          syncSupplier: syncMode ? syncSupplier.trim() : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t("import.mapping.startError"));
        return;
      }

      onComplete();
    } catch {
      setError(t("import.mapping.startError"));
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("import.mapping.subtitle", { count: totalRows })}
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">
                {t("import.mapping.colHeader")}
              </TableHead>
              <TableHead className="w-[180px]">
                {t("import.mapping.colSample")}
              </TableHead>
              <TableHead>{t("import.mapping.colMapsTo")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {headers.map((header) => {
              const sampleVal = preview[0]?.[header] ?? "";
              const currentMapping = mapping[header] ?? "";
              const fieldDef = PRODUCT_FIELDS.find(
                (f) => f.key === currentMapping
              );

              return (
                <TableRow key={header}>
                  <TableCell className="font-mono text-xs font-medium">
                    {header}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                    {sampleVal || <span className="italic">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <select
                        value={currentMapping}
                        onChange={(e) =>
                          setMapping((prev) => ({
                            ...prev,
                            [header]: e.target.value,
                          }))
                        }
                        className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">
                          {t("import.mapping.skip")}
                        </option>
                        {PRODUCT_FIELDS.map((f) => (
                          <option
                            key={f.key}
                            value={f.key}
                            disabled={
                              mappedValues.includes(f.key) &&
                              mapping[header] !== f.key
                            }
                          >
                            {t(`import.fields.${f.key}`)}
                            {f.required ? " *" : ""}
                          </option>
                        ))}
                      </select>
                      {fieldDef?.required && (
                        <Badge variant="secondary" className="text-xs">
                          {t("import.mapping.required")}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Sync mode */}
      <div className="rounded-lg border p-4 space-y-3">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={syncMode}
            onChange={(e) => setSyncMode(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <div>
            <span className="text-sm font-medium flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              {t("import.mapping.syncMode")}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("import.mapping.syncModeDesc")}
            </p>
          </div>
        </label>

        {syncMode && (
          <div className="ml-7 space-y-1.5">
            <Label htmlFor="syncSupplier" className="text-xs">
              {t("import.mapping.syncSupplier")}
            </Label>
            <Input
              id="syncSupplier"
              value={syncSupplier}
              onChange={(e) => setSyncSupplier(e.target.value)}
              placeholder={t("import.mapping.syncSupplierPlaceholder")}
              className="h-8 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {t("import.mapping.syncSupplierHint")}
            </p>
          </div>
        )}
      </div>

      {missingRequired.length > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t("import.mapping.missingFields", {
            fields: missingRequired
              .map((f) => t(`import.fields.${f}`))
              .join(", "),
          })}
        </div>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isStarting}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleStartImport}
          disabled={!canStart || isStarting}
        >
          {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isStarting
            ? t("import.mapping.starting")
            : t("import.mapping.startImport")}
        </Button>
      </div>
    </div>
  );
}
