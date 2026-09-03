"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, ShoppingCart } from "lucide-react";
import { EqOverlay } from "@/components/ui/EqOverlay";
import { Button } from "@/components/ui/button";
import { useAudioActions } from "@/components/AudioPlayerContext";
import { toPlayableBeat } from "@/features/beats/playable-beat";
import type { IBeat } from "@/types";

interface PinnedBeatItem {
  beat: Pick<
    IBeat,
    "_id" | "title" | "coverUrl" | "audioTaggedUrl" | "producerName" | "genre"
  >;
  startingPrice: number | null;
}

interface PinnedBeatsProps {
  items: PinnedBeatItem[];
}

export default function PinnedBeats({ items }: PinnedBeatsProps) {
  const { playBeat, currentBeat, isPlaying } = useAudioActions();
  const queue = items.map(({ beat }) => toPlayableBeat(beat));

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="pinned-heading">
      <h2 id="pinned-heading" className="mb-4 text-xl font-bold">
        Pinned
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map(({ beat, startingPrice }) => {
          const beatId = beat._id.toString();
          const isThisBeatPlaying = currentBeat?.id === beatId && isPlaying;

          const handlePlay = () => {
            playBeat(
              {
                id: beatId,
                title: beat.title,
                producerName: beat.producerName ?? "",
                coverUrl: beat.coverUrl,
                previewUrl: beat.audioTaggedUrl,
              },
              { queue }
            );
          };

          return (
            <article key={beatId} className="group">
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                {beat.coverUrl ? (
                  <Image
                    src={beat.coverUrl}
                    alt={beat.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Play className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={handlePlay}
                  aria-label={isThisBeatPlaying ? `Pause ${beat.title}` : `Play ${beat.title}`}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-play-button text-primary-foreground shadow-lg">
                    {isThisBeatPlaying ? (
                      <EqOverlay />
                    ) : (
                      <Play className="h-6 w-6 translate-x-0.5" />
                    )}
                  </span>
                </button>
              </div>

              <div className="space-y-2 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/beats/${beatId}`} className="min-w-0">
                    <h3 className="truncate text-lg font-semibold transition-colors group-hover:text-primary">
                      {beat.title}
                    </h3>
                    {beat.genre && (
                      <p className="text-xs text-muted-foreground">{beat.genre}</p>
                    )}
                  </Link>
                  {startingPrice !== null && (
                    <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-destructive">
                      <ShoppingCart className="h-4 w-4" />
                      ₹{startingPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <Button asChild size="sm" className="w-full min-h-11 sm:min-h-8">
                  <Link href={`/beats/${beatId}`}>License</Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
