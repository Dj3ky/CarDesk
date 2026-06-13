"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Upload, AlertTriangle, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function BackupPanel() {
  const t = useTranslations("settings.backup");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloadState, setDownloadState] = useState<"idle" | "loading">("idle");
  const [restoreState, setRestoreState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [restoreError, setRestoreError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloadState("loading");
    try {
      const res = await fetch("/api/backup/create");
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const filename =
        res.headers.get("Content-Disposition")?.match(/filename="(.+?)"/)?.[1] ??
        `cardesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore — browser download errors are not actionable
    } finally {
      setDownloadState("idle");
    }
  }

  async function handleRestore() {
    if (!selectedFile) return;
    setRestoreState("loading");
    setRestoreError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setRestoreState("error");
        setRestoreError(json.error ?? t("restoreError"));
      } else {
        setRestoreState("success");
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch {
      setRestoreState("error");
      setRestoreError(t("restoreError"));
    }
  }

  return (
    <div className="space-y-6">
      {/* Create / Download Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("createTitle")}</CardTitle>
          <CardDescription>{t("createDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownload}
            disabled={downloadState === "loading"}
          >
            {downloadState === "loading" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {downloadState === "loading" ? t("downloading") : t("downloadButton")}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("restoreTitle")}</CardTitle>
          <CardDescription>{t("restoreDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("restoreWarning")}</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t("chooseFile")}
            </Button>
            {selectedFile && (
              <span className="text-sm text-muted-foreground truncate max-w-xs">
                {selectedFile.name}
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="destructive"
            disabled={!selectedFile || restoreState === "loading"}
            onClick={handleRestore}
          >
            {restoreState === "loading" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {restoreState === "loading" ? t("restoring") : t("restoreButton")}
          </Button>

          {restoreState === "success" && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t("restoreSuccess")}
            </div>
          )}
          {restoreState === "error" && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {restoreError ?? t("restoreError")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
