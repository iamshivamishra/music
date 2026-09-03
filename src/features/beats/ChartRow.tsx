import Image from "next/image";
import Link from "next/link";
import { Flame, Headphones, Music, ShoppingBag } from "lucide-react";
import type { PublicBeatForUi } from "@/lib/serializers/beat";

function formatPlays(plays: number): string {
  if (plays >= 1000) return `${(plays / 1000).toFixed(1)}K`;
  return String(plays);
}

interface ChartRowProps {
  beat: PublicBeatForUi;
  position: number;
  salesInWindow: number;
  startingPrice: number | null;
}

export default function ChartRow({
  beat,
  position,
  salesInWindow,
  startingPrice,
}: ChartRowProps) {
  const isTopThree = position <= 3;

  return (
    <Link
      href={`/beats/${beat._id}?src=charts`}
      className={`group flex items-center gap-4 rounded-2xl border p-4 transition-colors hover:bg-card/90 ${
        isTopThree
          ? "border-primary/30 bg-card/70 backdrop-blur-sm"
          : "border-border/50 bg-card/50"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${
          isTopThree
            ? "bg-primary/15 text-lg text-primary"
            : "bg-muted/50 text-muted-foreground"
        }`}
      >
        {position}
      </div>

      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
        {beat.coverUrl ? (
          <Image
            src={beat.coverUrl}
            alt={beat.title}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Music className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        {isTopThree && (
          <div className="absolute -right-1 -top-1">
            <Flame className="h-4 w-4 text-primary drop-shadow" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold transition-colors group-hover:text-primary">
          {beat.title}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {beat.producerName}
          {beat.genre && (
            <span className="ml-2 text-xs opacity-70">{beat.genre}</span>
          )}
        </p>
      </div>

      <div className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
        <span className="flex items-center gap-1" title="Plays">
          <Headphones className="h-3.5 w-3.5" />
          {formatPlays(beat.plays)}
        </span>
        <span className="flex items-center gap-1" title="Sales this week">
          <ShoppingBag className="h-3.5 w-3.5" />
          {salesInWindow} sales this week
        </span>
      </div>

      <div className="shrink-0 text-right">
        {startingPrice != null ? (
          <span className="font-semibold text-primary">₹{startingPrice}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>
    </Link>
  );
}
