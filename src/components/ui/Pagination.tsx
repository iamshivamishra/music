import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  getPageUrl: (page: number) => string;
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);

  return pages;
}

export function Pagination({ page, totalPages, getPageUrl }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 ? (
        <Link
          href={getPageUrl(page - 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm text-muted-foreground transition-colors hover:bg-accent"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm text-muted-foreground/40"
          aria-hidden="true"
        >
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {pages.map((item, idx) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${idx}`}
            className="inline-flex h-9 w-9 items-center justify-center text-sm text-muted-foreground"
            aria-hidden="true"
          >
            &hellip;
          </span>
        ) : (
          <Link
            key={item}
            href={getPageUrl(item)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors ${
              item === page
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
            aria-current={item === page ? "page" : undefined}
          >
            {item}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link
          href={getPageUrl(page + 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm text-muted-foreground transition-colors hover:bg-accent"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm text-muted-foreground/40"
          aria-hidden="true"
        >
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
