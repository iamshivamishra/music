import type { Metadata } from "next";
import { TrendingUp, Music, Clock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import BeatQueueGrid from "@/features/beats/BeatQueueGrid";
import ChartRow from "@/features/beats/ChartRow";
import ChartSection from "@/features/beats/ChartSection";
import { chartService } from "@/lib/services/chart.service";
import { presignService } from "@/lib/services/presign.service";
import type { PricedPublicBeat } from "@/lib/serializers/beat";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "India Top 10 — Weekly Chart | Trishul Beats",
  description:
    "Discover the hottest beats in India this week. See the top 10 trending beats ranked by sales, plays, and likes on Trishul Beats.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/charts`,
  },
  openGraph: {
    title: "India Top 10 — Weekly Chart | Trishul Beats",
    description:
      "Discover the hottest beats in India this week. Top 10 trending beats ranked by sales, plays, and likes.",
  },
};

async function withPresignedBeats<T extends PricedPublicBeat>(entries: T[]): Promise<T[]> {
  if (entries.length === 0) return entries;

  const presigned = await presignService.withPresignedBeatCovers(
    entries.map((entry) => entry.beat),
  );
  const byId = new Map(presigned.map((beat) => [beat._id.toString(), beat]));

  return entries.flatMap((entry) => {
    const beat = byId.get(entry.beat._id.toString());
    return beat ? [{ ...entry, beat }] : [];
  });
}

export default async function ChartsPage() {
  const [chart, newDrops, editorPicks] = await Promise.all([
    chartService.getWeeklyChart(10),
    chartService.getNewDrops(20),
    chartService.getEditorPicks(),
  ]);

  const [chartRows, dropRows, pickRows] = await Promise.all([
    withPresignedBeats(chart),
    withPresignedBeats(newDrops),
    withPresignedBeats(editorPicks),
  ]);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title flex items-center gap-2">
              India Top 10
              <Badge variant="secondary" className="text-xs">
                This Week
              </Badge>
            </h1>
            <p className="page-subtitle">
              Weekly chart ranked by sales, plays &amp; likes
            </p>
          </div>
        </div>
      </div>

      <section aria-labelledby="chart-heading" className="mt-8">
        <h2 id="chart-heading" className="sr-only">
          Top 10 Chart
        </h2>

        {chartRows.length > 0 ? (
          <div className="space-y-3">
            {chartRows.map((entry, index) => (
              <ChartRow
                key={entry.beat._id.toString()}
                beat={entry.beat}
                position={index + 1}
                salesInWindow={entry.salesInWindow}
                startingPrice={entry.startingPrice}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/50 py-20 text-center">
            <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/60" />
            <p className="text-lg font-medium">No chart data yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The chart will populate as beats get plays and sales.
            </p>
          </div>
        )}
      </section>

      {pickRows.length > 0 && (
        <ChartSection
          id="editor-picks-heading"
          icon={Star}
          title="Editor's Picks"
          subtitle="Handpicked by the Trishul Beats team"
        >
          <BeatQueueGrid
            items={pickRows}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            hrefSrc="charts"
          />
        </ChartSection>
      )}

      <ChartSection
        id="new-drops-heading"
        icon={Clock}
        title="New This Week"
        subtitle="Fresh beats published in the last 7 days"
      >
        {dropRows.length > 0 ? (
          <BeatQueueGrid
            items={dropRows}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            hrefSrc="charts"
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/50 py-16 text-center">
            <Music className="mb-4 h-12 w-12 text-muted-foreground/60" />
            <p className="text-lg font-medium">No new drops this week</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon for fresh beats.
            </p>
          </div>
        )}
      </ChartSection>
    </div>
  );
}
