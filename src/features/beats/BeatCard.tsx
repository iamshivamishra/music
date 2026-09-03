// components/BeatCard.tsx
"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, AudioWaveform, ShoppingCart, Music, Heart, PackageOpen, Share2, Copy, Check } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { buildWhatsAppBeatShareUrl, trackBeatShare } from "@/lib/utils/whatsapp";
import { appendSrc } from "@/lib/attribution";
import { EqOverlay } from "@/components/ui/EqOverlay";
import { FoundingBadge } from "@/components/FoundingBadge";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAudioActions } from "@/components/AudioPlayerContext";
import type { PlayableBeat } from "@/features/beats/playable-beat";
import type { AttributionSource } from "@/types";
import type { PublicBeatForUi } from "@/lib/serializers/beat";

type BeatCardBeat = Pick<
  PublicBeatForUi,
  | "_id"
  | "title"
  | "coverUrl"
  | "audioTaggedUrl"
  | "bpm"
  | "genre"
  | "likesCount"
  | "producerName"
  | "producerUsername"
  | "saleMode"
  | "producerTier"
>;

interface BeatCardProps {
  beat: BeatCardBeat;
  startingPrice?: number;
  isPurchased?: boolean;
  priority?: boolean;
  queue?: PlayableBeat[];
  hrefSrc?: AttributionSource;
}

export default function BeatCard({
  beat,
  startingPrice,
  isPurchased,
  priority = false,
  queue,
  hrefSrc,
}: BeatCardProps) {
  const { playBeat, currentBeat, isPlaying } = useAudioActions();

  const beatId = beat._id;
  const beatHref = hrefSrc ? appendSrc(`/beats/${beatId}`, hrefSrc) : `/beats/${beatId}`;

  const isThisBeatActive = currentBeat?.id === beatId;
  const isThisBeatPlaying = isThisBeatActive && isPlaying;

  const handlePlayClick = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    playBeat(
      {
        id: beatId,
        title: beat.title,
        producerName: beat.producerName ?? "",
        coverUrl: beat.coverUrl,
        previewUrl: beat.audioTaggedUrl,
      },
      queue ? { queue } : undefined,
    );
  };

  return (
    <div className="group w-full bg-transparent">
      {/* IMAGE - sirf yahi rounded/contained hai */}
      <div
        role="button"
        tabIndex={0}
        onClick={handlePlayClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handlePlayClick(e);
        }}
        aria-label={isThisBeatPlaying ? `Pause ${beat.title}` : `Play ${beat.title}`}
        className={`relative block aspect-square w-full cursor-pointer overflow-hidden rounded-xl ${
          isThisBeatActive ? "ring-2 ring-primary" : ""
        }`}
      >
        {beat.coverUrl ? (
          <Image
            src={beat.coverUrl}
            alt={beat.title}
            fill
            sizes="(max-width:640px)50vw,(max-width:1024px)33vw,20vw"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Music className="h-10 w-10 text-muted-foreground" />
          </div>
        )}

        {/* Play Button */}
        <div className="absolute bottom-3 left-3 z-10">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-all duration-300 ${
              isThisBeatActive
                ? "bg-primary text-primary-foreground scale-100 opacity-100"
                : "bg-play-button text-primary-foreground scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100"
            }`}
          >
            {isThisBeatPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            )}
          </div>
        </div>

        {isThisBeatPlaying && (
          <div className="absolute right-3 bottom-3 z-10">
            <EqOverlay />
          </div>
        )}

        {isPurchased && (
          <Badge className="absolute right-2 top-2 z-20 rounded-full bg-success-text px-2 py-0.5 text-[10px] text-primary-foreground shadow">
            Purchased
          </Badge>
        )}

        {beat.saleMode === "pack_only" && !isPurchased && (
          <Badge className="absolute left-2 top-2 z-20 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow backdrop-blur-sm">
            <PackageOpen className="mr-0.5 h-2.5 w-2.5" />
            Pack Only
          </Badge>
        )}
      </div>

      {/* CONTENT - transparent, seedha page bg pe */}
      <div className="space-y-2 pt-3">
        <Link href={beatHref} className="block bg-transparent">
          {/* Row 1: BPM left, price (no border) right */}
          <div className="flex items-center justify-between">
            {beat.bpm ? (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <AudioWaveform className="h-4 w-4" />
                {beat.bpm} BPM
              </span>
            ) : (
              <span />
            )}
            {startingPrice !== undefined && beat.saleMode !== "pack_only" && (
              <span className="flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  ₹{startingPrice.toLocaleString("en-IN")}
                </span>
              </span>
            )}
          </div>

          {/* Title + producer badge row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="truncate text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
                {beat.title}
              </h3>
              {beat.genre && (
                <Badge
                  variant="secondary"
                  className="shrink-0 rounded-md border border-amber-500/50 bg-transparent p-1 text-amber-500"
                >
                  <AudioWaveform className="h-3 w-3" />
                </Badge>
              )}
            </div>
          </div>
        </Link>

        {/* Producer */}
        {beat.producerUsername ? (
          <Link
            href={`/producer/${beat.producerUsername}`}
            className="flex w-fit items-center gap-1.5 truncate text-base text-muted-foreground hover:text-primary hover:underline"
          >
            {beat.producerName || "Unknown Producer"}
            {beat.producerTier === "founding" && <FoundingBadge />}
          </Link>
        ) : (
          <p className="flex items-center gap-1.5 truncate text-base text-muted-foreground">
            {beat.producerName || "Unknown Producer"}
            {beat.producerTier === "founding" && <FoundingBadge />}
          </p>
        )}
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Heart className="h-3.5 w-3.5" />
            {(beat.likesCount ?? 0).toLocaleString()} likes
          </p>
          <BeatCardShareMenu beatId={beatId} title={beat.title} producerName={beat.producerName} />
        </div>
      </div>
    </div>
  );
}

function BeatCardShareMenu({
  beatId,
  title,
  producerName,
}: {
  beatId: string;
  title: string;
  producerName?: string;
}) {
  const [copied, setCopied] = useState(false);

  const beatUrl = typeof window !== "undefined"
    ? `${window.location.origin}/beats/${beatId}`
    : `/beats/${beatId}`;

  const whatsappHref = buildWhatsAppBeatShareUrl(title, producerName, beatUrl);

  const trackShare = useCallback(() => trackBeatShare(beatId), [beatId]);
  const trackWhatsAppShare = useCallback(() => trackBeatShare(beatId, "whatsapp"), [beatId]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(beatUrl);
      setCopied(true);
      trackShare();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }, [beatUrl, trackShare]);

  return (
    <Popover>
      <PopoverTrigger
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={`Share ${title}`}
      >
        <Share2 className="h-3.5 w-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1.5" align="end" sideOffset={6}>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { e.stopPropagation(); trackWhatsAppShare(); }}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-foreground transition-colors hover:bg-accent"
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
          Share on WhatsApp
        </a>
        <button
          onClick={handleCopy}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-foreground transition-colors hover:bg-accent"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success-text" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </PopoverContent>
    </Popover>
  );
}