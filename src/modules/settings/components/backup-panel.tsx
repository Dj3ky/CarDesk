"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Upload, AlertTriangle, Loader2, CheckCircle2, AlertCircle, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type DownloadState = "idle" | "loading" | "error";
type RestoreState = "idle" | "loading" | "success" | "error";

export function BackupPanel() {
  const t = useTranslations("settings.backup");

  // JSON backup
  const jsonFileRef = useRef<HTMLInputElement>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [jsonDownload, setJsonDownload] = useState<DownloadState>("idle");
  const [jsonRestore, setJsonRestore] = useState<RestoreState>("idle");
  const [jsonRestoreError, setJsonRestoreError] = useState<string | null>(null);

  // pg_dump backup
  const pgFileRef = useRef<HTMLInputElement>(null);
  const [pgFile, setPgFile] = useState<File | null>(null);
  const [pgDownload, setPgDownload] = useState<DownloadState>("idle");
  const [pgRestore, setPgRestore] = useState<RestoreState>("idle");
  const [pgRestoreError, setPgRestoreError] = useState<string | null>(null);

  // Restart
  const [restartState, setRestartState] = useState<"idle" | "restarting" | "waiting" | "done">("idle");

  async function triggerDownload(endpoint: string, fallbackName: string, setter: (s: DownloadState) => void) {
    setter("loading");
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const filename =
        res.headers.get("Content-Disposition")?.match(/filename="(.+?)"/)?.[1] ?? fallbackName;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
      setter("idle");
    } catch {
      setter("error");
    }
  }

  async function handleJsonRestore() {
    if (!jsonFile) return;
    setJsonRestore("loading");
    setJsonRestoreError(null);
    const formData = new FormData();
    formData.append("file", jsonFile);
    try {
      const res = await fetch("/api/backup/restore", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setJsonRestore("error");
        setJsonRestoreError(json.error ?? t("restoreError"));
      } else {
        setJsonRestore("success");
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch {
      setJsonRestore("error");
      setJsonRestoreError(t("restoreError"));
    }
  }

  async function handlePgRestore() {
    if (!pgFile) return;
    setPgRestore("loading");
    setPgRestoreError(null);
    try {
      const res = await fetch("/api/backup/pgrestore", {
        method: "POST",
        body: pgFile,
        headers: { "Content-Type": "application/octet-stream" },
      });
      const json = await res.json();
      if (!res.ok) {
        setPgRestore("error");
        setPgRestoreError(json.error ?? t("restoreError"));
      } else {
        setPgRestore("success");
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch {
      setPgRestore("error");
      setPgRestoreError(t("restoreError"));
    }
  }

  async function handleRestart() {
    setRestartState("restarting");
    try {
      await fetch("/api/backup/restart", { method: "POST" });
    } catch {
      // Expected — server may close the connection before responding
    }
    setRestartState("waiting");
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (res.ok) {
          clearInterval(poll);
          setRestartState("done");
          setTimeout(() => window.location.reload(), 800);
        }
      } catch {
        // Still down — keep polling
      }
    }, 1500);
  }

  return (
    <div className="space-y-6">

      {/* Full pg_dump backup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            {t("pgTitle")}
          </CardTitle>
          <CardDescription>{t("pgDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => triggerDownload(
                "/api/backup/pgdump",
                `cardesk-pgdump-${new Date().toISOString().slice(0, 10)}.dump`,
                setPgDownload,
              )}
              disabled={pgDownload === "loading"}
            >
              {pgDownload === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {pgDownload === "loading" ? t("downloading") : t("pgDownloadButton")}
            </Button>
          </div>
          {pgDownload === "error" && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {t("downloadError")}
            </div>
          )}

          <Separator />

          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("restoreWarning")}</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={pgFileRef}
              type="file"
              accept=".dump"
              className="hidden"
              onChange={(e) => setPgFile(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" onClick={() => pgFileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {t("chooseFile")}
            </Button>
            {pgFile && (
              <span className="text-sm text-muted-foreground truncate max-w-xs">{pgFile.name}</span>
            )}
          </div>

          <Button
            type="button"
            variant="destructive"
            disabled={!pgFile || pgRestore === "loading"}
            onClick={handlePgRestore}
          >
            {pgRestore === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {pgRestore === "loading" ? t("restoring") : t("pgRestoreButton")}
          </Button>

          {pgRestore === "success" && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t("restoreSuccess")}
            </div>
          )}
          {pgRestore === "error" && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {pgRestoreError ?? t("restoreError")}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* JSON backup (no products) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("createTitle")}</CardTitle>
          <CardDescription>{t("createDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => triggerDownload(
              "/api/backup/create",
              `cardesk-backup-${new Date().toISOString().slice(0, 10)}.json`,
              setJsonDownload,
            )}
            disabled={jsonDownload === "loading"}
          >
            {jsonDownload === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {jsonDownload === "loading" ? t("downloading") : t("downloadButton")}
          </Button>
          {jsonDownload === "error" && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {t("downloadError")}
            </div>
          )}

          <Separator />

          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("restoreWarning")}</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={jsonFileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => setJsonFile(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" onClick={() => jsonFileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {t("chooseFile")}
            </Button>
            {jsonFile && (
              <span className="text-sm text-muted-foreground truncate max-w-xs">{jsonFile.name}</span>
            )}
          </div>

          <Button
            type="button"
            variant="destructive"
            disabled={!jsonFile || jsonRestore === "loading"}
            onClick={handleJsonRestore}
          >
            {jsonRestore === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {jsonRestore === "loading" ? t("restoring") : t("restoreButton")}
          </Button>

          {jsonRestore === "success" && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t("restoreSuccess")}
            </div>
          )}
          {jsonRestore === "error" && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {jsonRestoreError ?? t("restoreError")}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Restart Services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("restartTitle")}</CardTitle>
          <CardDescription>{t("restartDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("restartWarning")}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={restartState !== "idle"}
            onClick={handleRestart}
          >
            {restartState === "restarting" || restartState === "waiting" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {restartState === "idle" && t("restartButton")}
            {restartState === "restarting" && t("restarting")}
            {restartState === "waiting" && t("restartWaiting")}
            {restartState === "done" && t("restartDone")}
          </Button>

          {restartState === "done" && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t("restartDone")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
