"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
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
