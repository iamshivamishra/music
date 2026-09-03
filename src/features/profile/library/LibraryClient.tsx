import Link from "next/link";
import { Search, Library as LibraryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { LibraryItemCard } from "./LibraryItemCard";
import type { LibraryResult } from "@/lib/serializers/library";

interface LibraryClientProps {
  initialData: LibraryResult;
  currentPage: number;
  initialSearch: string;
}

function libraryPageUrl(page: number, search: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (search) params.set("search", search);
  const qs = params.toString();
  return qs ? `/profile/library?${qs}` : "/profile/library";
}

export default function LibraryClient({
  initialData,
  currentPage,
  initialSearch,
}: LibraryClientProps) {
  const { data: items, totalPages, total } = initialData;

  if (total === 0 && !initialSearch) {
    return (
      <div className="page-shell flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <LibraryIcon className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold">Your library is empty</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse beats to get started!
        </p>
        <Button asChild className="mt-4">
          <Link href="/beats">Browse Beats</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">My Library</h1>
          <p className="text-sm text-muted-foreground">
            {total} beat{total !== 1 ? "s" : ""} purchased
          </p>
        </div>
        <form
          action="/profile/library"
          method="get"
          className="relative w-full sm:max-w-xs"
        >
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="search"
            defaultValue={initialSearch}
            placeholder="Search by title..."
            aria-label="Search library by title"
            className="pl-9"
          />
          <button type="submit" className="sr-only">
            Search
          </button>
        </form>
      </div>

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <LibraryItemCard key={item.purchaseId} item={item} />
          ))}
        </div>
      )}

      {items.length === 0 && initialSearch && (
        <div
          className="py-12 text-center text-muted-foreground"
          role="status"
        >
          <Search className="mx-auto mb-2 h-8 w-8" aria-hidden="true" />
          <p>No beats found for &ldquo;{initialSearch}&rdquo;</p>
          <Button asChild variant="link" className="mt-2">
            <Link href="/profile/library">Clear search</Link>
          </Button>
        </div>
      )}

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        getPageUrl={(p) => libraryPageUrl(p, initialSearch)}
      />
    </div>
  );
}
