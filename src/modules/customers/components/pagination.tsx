import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}

function buildUrl(
  basePath: string,
  page: number,
  searchParams: Record<string, string | undefined>
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v) params.set(k, v);
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export function Pagination({ page, totalPages, basePath, searchParams = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPaginationRange(page, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <Button variant="outline" size="icon" asChild disabled={page <= 1}>
        <Link href={page > 1 ? buildUrl(basePath, page - 1, searchParams) : "#"}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous</span>
        </Link>
      </Button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground select-none">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="icon"
            asChild
          >
            <Link href={buildUrl(basePath, p as number, searchParams)}>
              {p}
            </Link>
          </Button>
        )
      )}

      <Button variant="outline" size="icon" asChild disabled={page >= totalPages}>
        <Link href={page < totalPages ? buildUrl(basePath, page + 1, searchParams) : "#"}>
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next</span>
        </Link>
      </Button>
    </nav>
  );
}

function getPaginationRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}
