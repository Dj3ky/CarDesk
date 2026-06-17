"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FORM_WARNINGS: Record<string, string> = {
  en: "Save or cancel the form before switching language.",
  sl: "Pred menjavo jezika shranite ali prekličite obrazec.",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    if (pathname.endsWith("/new") || pathname.endsWith("/edit")) {
      toast.warning(FORM_WARNINGS[locale] ?? FORM_WARNINGS.en);
      return;
    }
    const next = locale === "en" ? "sl" : "en";
    router.replace(pathname, { locale: next });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="font-mono text-xs font-semibold w-10 px-0 text-muted-foreground hover:text-foreground"
      title={locale === "en" ? "Switch to Slovenian" : "Preklopi na angleščino"}
    >
      {locale.toUpperCase()}
    </Button>
  );
}
