"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Clock, Music } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/format";
import type { IBeat } from "@/types";

interface BeatCardProps {
  beat: IBeat;
  startingPrice?: number;
  isPurchased?: boolean;
}

export default function BeatCard({ beat, startingPrice, isPurchased }: BeatCardProps) {
  return (
    <Link
      href={`/beats/${beat._id}`}
      aria-label={`Open beat ${beat.title}`}
      className="focus-ring block rounded-xl"
    >
      <Card className="group overflow-hidden border-border/60 bg-card/70 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card">
        <div className="relative aspect-square overflow-hidden">
          {beat.coverUrl ? (
            <Image
              src={beat.coverUrl}
              alt={beat.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10">
              <Music className="h-12 w-12 text-primary/40" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
            <div className="rounded-full bg-primary p-3">
              <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
            </div>
          </div>
          {isPurchased && (
            <Badge className="absolute right-2 top-2 bg-green-600">Purchased</Badge>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="truncate text-sm font-semibold leading-5">{beat.title}</h3>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(beat.duration)}
            </span>
            {beat.bpm && <span>{beat.bpm} BPM</span>}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">{beat.genre}</Badge>
            {startingPrice !== undefined && (
              <span className="text-sm font-bold text-primary">
                ₹{startingPrice}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
