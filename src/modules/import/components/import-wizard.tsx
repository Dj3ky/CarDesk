"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadStep } from "./upload-step";
import { MappingStep } from "./mapping-step";
import { ProgressStep } from "./progress-step";
import type { UploadResult } from "../types";

type Step = "upload" | "mapping" | "processing";

interface ImportWizardProps {
  locale: string;
}

export function ImportWizard({ locale }: ImportWizardProps) {
  const t = useTranslations();
  const [step, setStep] = useState<Step>("upload");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: t("import.steps.upload") },
    { key: "mapping", label: t("import.steps.mapping") },
    { key: "processing", label: t("import.steps.processing") },
  ];

  const stepIndex: Record<Step, number> = { upload: 0, mapping: 1, processing: 2 };
  const currentIndex = stepIndex[step];

  function reset() {
    setStep("upload");
    setUploadResult(null);
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  i < currentIndex
                    ? "bg-primary text-primary-foreground"
                    : i === currentIndex
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i < currentIndex ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  i === currentIndex
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-4 h-px w-12 flex-shrink-0",
                  i < currentIndex ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {steps[currentIndex].label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === "upload" && (
            <UploadStep
              onComplete={(result) => {
                setUploadResult(result);
                setStep("mapping");
              }}
            />
          )}

          {step === "mapping" && uploadResult && (
            <MappingStep
              jobId={uploadResult.jobId}
              headers={uploadResult.headers}
              preview={uploadResult.preview}
              totalRows={uploadResult.totalRows}
              onComplete={() => setStep("processing")}
              onBack={reset}
            />
          )}

          {step === "processing" && uploadResult && (
            <ProgressStep
              jobId={uploadResult.jobId}
              totalRows={uploadResult.totalRows}
              onReset={reset}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
