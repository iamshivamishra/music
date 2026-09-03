import type { Metadata } from "next";
import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { packFilterSchema } from "@/lib/validators/pack";
import { packService } from "@/lib/services/pack.service";
import { toPublicPackForUi } from "@/lib/serializers/pack";
import { GENRE_OPTIONS } from "@/lib/validators/beat";
import { Pagination } from "@/components/ui/Pagination";
import PackCard from "@/components/PackCard";
import { BeatsFilters } from "@/features/beats/BeatsFilters";

export const revalidate = 60;

interface BeatPacksPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: BeatPacksPageProps): Promise<Metadata> {
  const rawParams = await searchParams;
  const genre = typeof rawParams.genre === "string" ? rawParams.genre : null;
  const page = typeof rawParams.page === "string" ? Number(rawParams.page) : null;

  const parts: string[] = [];
  if (genre) parts.push(`${genre} Beat Packs`);
  else parts.push("Browse Beat Packs");
  if (page && page > 1) parts.push(`Page ${page}`);

  return {
    title: parts.join(" - "),
    description: genre
      ? `Browse curated ${genre.toLowerCase()} beat packs with multi-tier licensing.`
      : "Browse curated beat packs with multi-tier licensing. Bundle pricing saves you more.",
  };
}

export default async function BeatPacksPage({ searchParams }: BeatPacksPageProps) {
  const rawParams = await searchParams;
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    if (typeof v === "string") params[k] = v;
  }

  const filters = packFilterSchema.parse(params);
  const { result, producerMap } = await packService.listWithProducers(filters);

  const packs = result.data.map((pack) => {
    const producer = producerMap.get(pack.producerId.toString());
    return toPublicPackForUi(pack, producer);
  });

  const hasActiveFilters = Boolean(params.genre || params.search);

  function getPageUrl(page: number): string {
    const ps = new URLSearchParams({ ...params, page: String(page) });
    return `/beat-packs?${ps.toString()}`;
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Beat Packs</h1>
        <p className="page-subtitle">
          {result.total} packs available &mdash; bundle pricing saves you more
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-72">
          <BeatsFilters
            genres={[...GENRE_OPTIONS]}
            keys={[]}
            moods={[]}
            currentFilters={params}
          />
        </aside>

        <div className="flex-1">
          {packs.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {packs.map((pack) => (
                <PackCard
                  key={pack._id.toString()}
                  pack={{
                    _id: pack._id.toString(),
                    title: pack.title,
                    slug: pack.slug,
                    coverImages: pack.coverImages,
                    genre: pack.genre,
                    beatCount: pack.beatCount,
                    startingPrice: pack.startingPrice,
                    producerName: pack.producerName,
                    producerUsername: pack.producerUsername,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <PackageOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
              <p className="text-lg font-medium">No packs found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters or check back later.
              </p>
              {hasActiveFilters && (
                <Link
                  href="/beat-packs"
                  className="mt-4 inline-flex items-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
                >
                  Clear all filters
                </Link>
              )}
            </div>
          )}

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            getPageUrl={getPageUrl}
          />
        </div>
      </div>
    </div>
  );
}
