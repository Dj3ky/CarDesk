"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { GitPullRequest, Loader2, CheckCircle2, AlertCircle, RefreshCw, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CheckStatus = "idle" | "checking" | "upToDate" | "available" | "error";
type PullStatus = "idle" | "pulling" | "done" | "error";

interface CheckResult {
  upToDate: boolean;
  commitsBehind: number;
  localHash: string;
  remoteHash: string;
}

export function UpdatePanel() {
  const t = useTranslations("settings.update");
  const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle");
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [pullStatus, setPullStatus] = useState<PullStatus>("idle");
  const [pullLines, setPullLines] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [pullLines]);

  async function handleCheck() {
    setCheckStatus("checking");
    setCheckResult(null);
    setCheckError(null);

    try {
      const res = await fetch("/api/backup/git-check");
      const json = await res.json();
      if (!res.ok) {
        setCheckStatus("error");
        setCheckError(json.error ?? t("checkError"));
        return;
      }
      setCheckResult(json);
      setCheckStatus(json.upToDate ? "upToDate" : "available");
    } catch {
      setCheckStatus("error");
      setCheckError(t("checkError"));
    }
  }

  async function handleGitPull() {
    setPullStatus("pulling");
    setPullLines(["$ bash update.sh"]);

    try {
      const res = await fetch("/api/backup/git-pull", { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setPullStatus("error");
        setPullLines((prev) => [...prev, `Error: ${json.error ?? `HTTP ${res.status}`}`]);
        return;
      }
      if (!res.body) {
        setPullStatus("error");
        setPullLines((prev) => [...prev, "Error: no response body"]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const incoming = text.split("\n");
        setPullLines((prev) => {
          const updated = [...prev];
          incoming.forEach((chunk, i) => {
            if (i === 0 && updated.length > 0) {
              updated[updated.length - 1] += chunk;
            } else {
              updated.push(chunk);
            }
          });
          return updated;
        });
      }

      setPullStatus("done");
      setCheckStatus("idle");
      setCheckResult(null);
    } catch (err) {
      setPullStatus("error");
      setPullLines((prev) => [
        ...prev,
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      ]);
    }
  }

  return (
    <div className="space-y-6">
      {/* Check for updates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("checkTitle")}</CardTitle>
          <CardDescription>{t("checkDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            disabled={checkStatus === "checking" || pullStatus === "pulling"}
            onClick={handleCheck}
          >
            {checkStatus === "checking" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {checkStatus === "checking" ? t("checking") : t("checkButton")}
          </Button>

          {checkStatus === "upToDate" && checkResult && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                {t("upToDate")}{" "}
                <span className="font-mono opacity-60">({checkResult.localHash})</span>
              </span>
            </div>
          )}

          {checkStatus === "available" && checkResult && (
            <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
              <ArrowDownCircle className="h-4 w-4 shrink-0" />
              <span>
                {t("updateAvailable", { count: checkResult.commitsBehind })}{" "}
                <span className="font-mono opacity-60">
                  {checkResult.localHash} → {checkResult.remoteHash}
                </span>
              </span>
            </div>
          )}

          {checkStatus === "error" && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {checkError ?? t("checkError")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pull */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("pullTitle")}</CardTitle>
          <CardDescription>{t("pullDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant={checkStatus === "available" ? "default" : "outline"}
            disabled={pullStatus === "pulling"}
            onClick={handleGitPull}
          >
            {pullStatus === "pulling" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GitPullRequest className="mr-2 h-4 w-4" />
            )}
            {pullStatus === "pulling" ? t("pulling") : t("pullButton")}
          </Button>

          {pullLines.length > 0 && (
            <div
              ref={terminalRef}
              className="rounded-md bg-zinc-950 border border-zinc-800 p-3 h-48 overflow-y-auto font-mono text-xs leading-relaxed"
            >
              {pullLines.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("Error") || line.startsWith("\nError")
                      ? "text-red-400"
                      : line.startsWith("$ ")
                      ? "text-zinc-400"
                      : line.includes("exited with code 0")
                      ? "text-green-400"
                      : line.includes("exited with code")
                      ? "text-red-400"
                      : "text-green-300"
                  }
                >
                  {line || " "}
                </div>
              ))}
              {pullStatus === "pulling" && (
                <div className="flex items-center gap-1 text-zinc-500 mt-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{t("pulling")}</span>
                </div>
              )}
            </div>
          )}

          {pullStatus === "done" && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t("pullDone")}
            </div>
          )}
          {pullStatus === "error" && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {t("pullError")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
