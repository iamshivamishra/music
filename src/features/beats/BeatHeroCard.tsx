import Image from "next/image";
import Link from "next/link";
import {
  Music,
  BarChart3,
  ShoppingBag,
  Disc3,
  Calendar,
  Headphones,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BeatDetailPlayer from "@/features/beats/BeatDetailPlayer";
import LikeButton from "@/components/LikeButton";
import ShareDialog from "@/components/ShareDialog";
import EmbedCodeGenerator from "@/components/EmbedCodeGenerator";
import { normalizeAudioSource } from "@/lib/utils/audio-source";
import type { IUser } from "@/types";
import type { PublicBeatForUi } from "@/lib/serializers/beat";

interface BeatInteractionProps {
  hasPurchased: boolean;
  canViewUnpublished: boolean;
  initialLiked: boolean;
  isLoggedIn: boolean;
  canLike: boolean;
}

interface BeatHeroCardProps {
  beat: PublicBeatForUi;
  producer: Pick<IUser, "displayName" | "name" | "username"> | null;
  audioSrc: string;
  beatId: string;
  shareUrl: string;
  interaction: BeatInteractionProps;
  showEmbed?: boolean;
  showCreateOffer?: boolean;
}

export default function BeatHeroCard({
  beat,
  producer,
  audioSrc,
  beatId,
  shareUrl,
  interaction,
  showEmbed,
  showCreateOffer,
}: BeatHeroCardProps) {
  const { hasPurchased, canViewUnpublished, initialLiked, isLoggedIn, canLike } = interaction;
  const validAudioSrc = normalizeAudioSource(audioSrc);

  return (
    <div className="space-y-4 sm:space-y-5">
      <Card className="border-border/50 bg-card/60">
        <CardContent className="p-4 sm:p-5 md:p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            {/* Artwork */}
            <div className="relative aspect-square w-40 max-w-full shrink-0 overflow-hidden rounded-xl xs:w-48 sm:mx-0 sm:w-48 md:w-56 lg:w-64">
              {beat.coverUrl ? (
                <Image
                  src={beat.coverUrl}
                  alt={beat.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 640px) 160px, (max-width: 768px) 192px, 256px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/10">
                  <Music className="h-16 w-16 text-primary/30 sm:h-20 sm:w-20" />
                </div>
              )}
              {hasPurchased && (
                <Badge className="absolute right-2 top-2 bg-success-text text-xs sm:right-3 sm:top-3 sm:text-sm">
                  Purchased
                </Badge>
              )}
            </div>

            {/* Title + Meta */}
            <div className="flex w-full min-w-0 flex-1 flex-col justify-between space-y-3 text-center sm:space-y-4 sm:text-left">
              <div>
                <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
                  {beat.title}
                </h1>
                {producer && (
                  <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                    by{" "}
                    <Link
                      href={
                        producer.username
                          ? `/producer/${producer.username}`
                          : "#"
                      }
                      className="font-medium text-primary hover:underline"
                    >
                      {producer.displayName || producer.name}
                    </Link>
                    {beat.collabCredits && beat.collabCredits.length > 0 && (
                      <>
                        {" "}
                        ft.{" "}
                        {beat.collabCredits.map((credit, index) => (
                          <span key={credit.username}>
                            {index > 0 && ", "}
                            <Link
                              href={`/producer/${credit.username}`}
                              className="font-medium text-primary hover:underline"
                            >
                              @{credit.username}
                            </Link>
                          </span>
                        ))}
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground sm:justify-start sm:gap-x-4 sm:gap-y-2 sm:text-sm">
                <span className="flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                  {beat.plays.toLocaleString()} plays
                </span>
                {canViewUnpublished && (
                  <span className="flex items-center gap-1">
                    <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                    {beat.salesCount} sold
                  </span>
                )}
                <LikeButton
                  beatId={beatId}
                  initialLiked={initialLiked}
                  initialLikesCount={beat.likesCount ?? 0}
                  isLoggedIn={isLoggedIn}
                  canLike={canLike}
                />
                <ShareDialog
                  url={shareUrl}
                  title={beat.title}
                  producerName={producer?.displayName || producer?.name}
                  beatId={beatId}
                />
                {showEmbed && (
                  <EmbedCodeGenerator
                    beatId={beatId}
                    beatTitle={beat.title}
                    username={producer?.username}
                  />
                )}
                {showCreateOffer && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/studio/offers?beatId=${beatId}`}>
                      Create offer
                    </Link>
                  </Button>
                )}
              </div>

              {/* Stats grid */}
              <div className="mt-2">
                <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-left">
                  Stats
                </h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Published</p>
                    <p className="flex items-center justify-center gap-1.5 text-sm font-semibold sm:justify-start">
                      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {new Date(beat.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Genre</p>
                    <p className="flex items-center justify-center gap-1.5 text-sm font-semibold sm:justify-start">
                      <Headphones className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {beat.genre}
                    </p>
                  </div>
                  {beat.bpm && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">BPM</p>
                      <p className="flex items-center justify-center gap-1.5 text-sm font-semibold sm:justify-start">
                        <Disc3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {beat.bpm}
                      </p>
                    </div>
                  )}
                  {beat.key && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Key</p>
                      <p className="flex items-center justify-center gap-1.5 text-sm font-semibold sm:justify-start">
                        {beat.key}
                      </p>
                    </div>
                  )}
                  {beat.mood && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Mood</p>
                      <p className="flex items-center justify-center gap-1.5 text-sm font-semibold sm:justify-start">
                        {beat.mood}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Player — uses global AudioPlayerContext, no standalone <audio> */}
      {validAudioSrc ? (
        <BeatDetailPlayer
          beat={{
            id: beatId,
            title: beat.title,
            producerName: producer?.displayName || producer?.name || "",
            coverUrl: beat.coverUrl,
            previewUrl: validAudioSrc,
          }}
          audioSrc={validAudioSrc}
          previewOnly={!hasPurchased}
        />
      ) : (
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>Audio preview is currently unavailable for this beat.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
