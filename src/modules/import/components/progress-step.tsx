"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useLocale } from "next-intl";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ImportJobStatus } from "../types";

interface ProgressStepProps {
  jobId: string;
  totalRows: number;
  onReset: () => void;
}

const POLL_INTERVAL_MS = 2000;

export function ProgressStep({ jobId, totalRows, onReset }: ProgressStepProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [status, setStatus] = useState<ImportJobStatus | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/import/status/${jobId}`);
        if (!res.ok) return;
        const data: ImportJobStatus = await res.json();
        if (active) {
          setStatus(data);
          if (data.status === "COMPLETED" || data.status === "FAILED") {
            return; // stop polling
          }
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (active) setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();
    return () => {
      active = false;
    };
  }, [jobId]);

  const processed = status?.processedRows ?? 0;
  const total = status?.totalRows ?? totalRows;
  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  const isDone = status?.status === "COMPLETED" || status?.status === "FAILED";
  const isFailed = status?.status === "FAILED";
  const errors = status?.errors ?? [];

  return (
    <div className="space-y-6">
      {/* Status header */}
      <div className="flex items-center gap-3">
        {!isDone ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : isFailed ? (
          <XCircle className="h-6 w-6 text-destructive" />
        ) : (
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        )}
        <span className="font-semibold">
          {!isDone
            ? t("import.progress.processing", { processed, total })
            : isFailed
            ? t("import.progress.failed")
            : t("import.progress.complete")}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${isFailed ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-right">{percent}%</p>
      </div>

      {/* Stats */}
      {status && (
        <div className={`grid gap-4 ${status.syncMode ? "grid-cols-4" : "grid-cols-3"}`}>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {status.insertedRows.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("import.progress.inserted")}
            </p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {status.updatedRows.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("import.progress.updated")}
            </p>
          </div>
          {status.syncMode && (
            <div className="rounded-lg border p-4 text-center">
              <p className={`text-2xl font-bold ${status.deletedRows > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                {status.deletedRows.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("import.progress.deleted")}
              </p>
            </div>
          )}
          <div className="rounded-lg border p-4 text-center">
            <p className={`text-2xl font-bold ${status.errorRows > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {status.errorRows.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("import.progress.errors")}
            </p>
          </div>
        </div>
      )}

      {/* Error table */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive">
            {t("import.progress.errorsTable", {
              count: errors.length,
            })}
          </p>
          <div className="max-h-64 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">{t("import.progress.rowCol")}</TableHead>
                  <TableHead>{t("import.progress.errorCol")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.slice(0, 100).map((err, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{err.row}</TableCell>
                    <TableCell className="text-xs text-destructive">
                      {err.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Action buttons — shown only when done */}
      {isDone && (
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" onClick={onReset}>
            {t("import.progress.importAnother")}
          </Button>
          <Button asChild>
            <Link href={`/${locale}/products`}>
              {t("import.progress.viewProducts")}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
