"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useCallback, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function ProductSearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      value ? params.set("search", value) : params.delete("search");
      params.delete("page");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [pathname, router, searchParams]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push(e.target.value), 350);
  }

  return (
    <div className="relative flex items-center">
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        defaultValue={defaultValue}
        onChange={handleChange}
        placeholder={`${t("search")}…`}
        className="pl-9 pr-9 w-72"
      />
      {defaultValue && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 h-full w-9"
          onClick={() => push("")}
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">Clear</span>
        </Button>
      )}
    </div>
  );
}
