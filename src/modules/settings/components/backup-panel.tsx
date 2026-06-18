"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Download, Upload, AlertTriangle, Loader2, CheckCircle2, AlertCircle,
  RefreshCw, Database, Clock, Trash2, HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SettingsData } from "@/modules/settings/types";

type BackupEntry = { filename: string; size: number; createdAt: string };
type DownloadState = "idle" | "loading" | "error";
type RestoreState = "idle" | "loading" | "success" | "error";

interface BackupPanelProps {
  settings: Pick<SettingsData, "backupSchedule" | "backupScheduleHour" | "backupRetentionDays">;
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function BackupPanel({ settings }: BackupPanelProps) {
  const t = useTranslations("settings.backup");

  // pg_dump manual download + restore
  const pgFileRef = useRef<HTMLInputElement>(null);
  const [pgFile, setPgFile] = useState<File | null>(null);
  const [pgDownload, setPgDownload] = useState<DownloadState>("idle");
  const [pgRestore, setPgRestore] = useState<RestoreState>("idle");
  const [pgRestoreError, setPgRestoreError] = useState<string | null>(null);

  // Restart
  const [restartState, setRestartState] = useState<"idle" | "restarting" | "waiting" | "done">("idle");

  // Saved backups list
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(true);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  // Manual save to disk
  const [manualSaveState, setManualSaveState] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Schedule form
  const [schedule, setSchedule] = useState(settings.backupSchedule);
  const [scheduleHour, setScheduleHour] = useState(String(settings.backupScheduleHour));
  const [retentionDays, setRetentionDays] = useState(String(settings.backupRetentionDays));
  const [scheduleSave, setScheduleSave] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function loadBackups() {
    setBackupsLoading(true);
    try {
      const res = await fetch("/api/backup/list");
      if (res.ok) setBackups(await res.json());
    } finally {
      setBackupsLoading(false);
    }
  }

  useEffect(() => { loadBackups(); }, []);

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

  async function handleDownloadSaved(filename: string) {
    setDownloadingFile(filename);
    try {
      const res = await fetch(`/api/backup/download/${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } finally {
      setDownloadingFile(null);
    }
  }

  async function handleDeleteSaved(filename: string) {
    setDeletingFile(filename);
    try {
      const res = await fetch(`/api/backup/delete/${encodeURIComponent(filename)}`, { method: "DELETE" });
      if (res.ok) await loadBackups();
    } finally {
      setDeletingFile(null);
    }
  }

  async function handleManualSave() {
    setManualSaveState("loading");
    try {
      const res = await fetch("/api/backup/pgdump?save=1");
      if (!res.ok) throw new Error(`${res.status}`);
      // consume the response to avoid leaving it hanging
      await res.blob();
      setManualSaveState("success");
      await loadBackups();
      setTimeout(() => setManualSaveState("idle"), 3000);
    } catch {
      setManualSaveState("error");
      setTimeout(() => setManualSaveState("idle"), 4000);
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
      // Expected — server may close connection before responding
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

  async function handleScheduleSave() {
    setScheduleSave("loading");
    try {
      const res = await fetch("/api/backup/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupSchedule: schedule,
          backupScheduleHour: Number(scheduleHour),
          backupRetentionDays: Number(retentionDays),
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setScheduleSave("success");
      setTimeout(() => setScheduleSave("idle"), 3000);
    } catch {
      setScheduleSave("error");
      setTimeout(() => setScheduleSave("idle"), 4000);
    }
  }

  return (
    <div className="space-y-6">

      {/* Manual pg_dump */}
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
              {pgDownload === "loading"
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Download className="mr-2 h-4 w-4" />}
              {pgDownload === "loading" ? t("downloading") : t("pgDownloadButton")}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleManualSave}
              disabled={manualSaveState === "loading"}
            >
              {manualSaveState === "loading"
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <HardDrive className="mr-2 h-4 w-4" />}
              {manualSaveState === "loading" ? t("saving") : t("saveToServerButton")}
            </Button>
          </div>

          {pgDownload === "error" && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {t("downloadError")}
            </div>
          )}
          {manualSaveState === "success" && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t("saveSuccess")}
            </div>
          )}
          {manualSaveState === "error" && (
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
            {pgRestore === "loading"
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Upload className="mr-2 h-4 w-4" />}
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

      {/* Auto-backup schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t("scheduleTitle")}
          </CardTitle>
          <CardDescription>{t("scheduleDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{t("scheduleLabel")}</Label>
              <Select value={schedule} onValueChange={setSchedule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">{t("scheduleDisabled")}</SelectItem>
                  <SelectItem value="daily">{t("scheduleDaily")}</SelectItem>
                  <SelectItem value="weekly">{t("scheduleWeekly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("scheduleHourLabel")}</Label>
              <Select value={scheduleHour} onValueChange={setScheduleHour} disabled={schedule === "disabled"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {String(i).padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("retentionLabel")}</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                disabled={schedule === "disabled"}
              />
            </div>
          </div>

          <Button type="button" onClick={handleScheduleSave} disabled={scheduleSave === "loading"}>
            {scheduleSave === "loading" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("scheduleSaveButton")}
          </Button>

          {scheduleSave === "success" && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t("scheduleSaved")}
            </div>
          )}
          {scheduleSave === "error" && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {t("scheduleSaveError")}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Saved backups list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                {t("savedTitle")}
              </CardTitle>
              <CardDescription>{t("savedDesc")}</CardDescription>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={loadBackups} title={t("refresh")}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {backupsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : backups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("noBackups")}</p>
          ) : (
            <div className="divide-y rounded-md border">
              {backups.map((b) => (
                <div key={b.filename} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{b.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtBytes(b.size)} · {new Date(b.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={downloadingFile === b.filename}
                      onClick={() => handleDownloadSaved(b.filename)}
                      title={t("downloadFile")}
                    >
                      {downloadingFile === b.filename
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Download className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={deletingFile === b.filename}
                      onClick={() => handleDeleteSaved(b.filename)}
                      title={t("deleteFile")}
                      className="text-destructive hover:text-destructive"
                    >
                      {deletingFile === b.filename
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
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
            {restartState === "restarting" || restartState === "waiting"
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <RefreshCw className="mr-2 h-4 w-4" />}
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
