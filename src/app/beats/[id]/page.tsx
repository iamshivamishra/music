import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Music, Clock, ArrowLeft, ExternalLink, BarChart3,
  ShoppingBag, Disc3,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import AudioPlayer from "@/components/AudioPlayer";
import LicenseSelector from "@/components/LicenseSelector";
import DownloadPanel from "@/components/DownloadPanel";
import BeatCard from "@/components/BeatCard";

interface BeatPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BeatPageProps): Promise<Metadata> {
  const { id } = await params;
  const beat = await beatRepository.findById(id);
  if (!beat) return { title: "Beat Not Found" };

  const producer = await userRepository.findById(beat.producerId.toString());
  const producerName = producer?.displayName || producer?.name || "Unknown";

  const description =
    beat.description ||
    `${beat.genre} beat at ${beat.bpm || "—"} BPM by ${producerName}. Preview and license on Trishul Beats.`;

  return {
    title: `${beat.title} by ${producerName}`,
    description,
    openGraph: {
      title: `${beat.title} — Trishul Beats`,
      description: `${beat.genre} beat at ${beat.bpm || "—"} BPM. License now.`,
      images: beat.coverUrl ? [beat.coverUrl] : [],
      type: "music.song",
    },
    twitter: {
      card: "summary_large_image",
      title: `${beat.title} by ${producerName}`,
      description,
      images: beat.coverUrl ? [beat.coverUrl] : [],
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/beats/${id}`,
    },
  };
}

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default async function BeatPage({ params }: BeatPageProps) {
  const { id } = await params;
  const beat = await beatRepository.findById(id);
  if (!beat) notFound();

  const [licenses, session, producer, relatedBeats] = await Promise.all([
    licenseRepository.findByBeatId(id),
    auth(),
    userRepository.findById(beat.producerId.toString()),
    beatRepository.findRelated(id, beat.genre, beat.producerId.toString(), 6),
  ]);

  const hasPurchased = session?.user
    ? await purchaseRepository.hasPurchased(session.user.id, id)
    : false;

  const relatedWithPrices = await Promise.all(
    relatedBeats.map(async (b) => {
      const cheapest = await licenseRepository.findCheapestForBeat(b._id.toString());
      return { beat: b, startingPrice: cheapest?.price };
    })
  );

  const producerInitials = (producer?.displayName || producer?.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const cheapestLicense = licenses.reduce(
    (min, l) => (l.isActive && l.price < min ? l.price : min),
    Infinity
  );
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const producerName = producer?.displayName || producer?.name || "Unknown";

  const beatJsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: beat.title,
    description: beat.description || `${beat.genre} beat at ${beat.bpm || "—"} BPM`,
    genre: beat.genre,
    url: `${appUrl}/beats/${id}`,
    image: beat.coverUrl || undefined,
    byArtist: {
      "@type": "MusicGroup",
      name: producerName,
      url: producer?.username ? `${appUrl}/producer/${producer.username}` : undefined,
    },
    offers: cheapestLicense < Infinity
      ? {
          "@type": "Offer",
          price: cheapestLicense,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
        }
      : undefined,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(beatJsonLd) }}
      />
      {/* Back */}
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/marketplace">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Marketplace
        </Link>
      </Button>

      {/* Hero: Artwork + Info + Player */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* ====================== LEFT COLUMN ====================== */}
        <div className="space-y-6">
          {/* Top section: artwork + title/meta side by side on larger screens */}
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Artwork */}
            <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-xl sm:w-56 md:w-64">
              {beat.coverUrl ? (
                <Image
                  src={beat.coverUrl}
                  alt={beat.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 640px) 100vw, 256px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/10">
                  <Music className="h-20 w-20 text-primary/30" />
                </div>
              )}
              {hasPurchased && (
                <Badge className="absolute right-3 top-3 bg-green-600 text-sm">
                  Purchased
                </Badge>
              )}
            </div>

            {/* Title + Meta */}
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {beat.title}
                </h1>
                {producer && (
                  <p className="mt-1 text-muted-foreground">
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
                  </p>
                )}

                {/* Stats row */}
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {beat.plays.toLocaleString()} plays
                  </span>
                  <span className="flex items-center gap-1">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    {beat.salesCount} sold
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(beat.duration)}
                  </span>
                </div>
              </div>

              {/* Meta badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">{beat.genre}</Badge>
                {beat.bpm && (
                  <Badge variant="outline">
                    <Disc3 className="mr-1 h-3 w-3" />
                    {beat.bpm} BPM
                  </Badge>
                )}
                {beat.key && <Badge variant="outline">Key: {beat.key}</Badge>}
                {beat.mood && <Badge variant="outline">{beat.mood}</Badge>}
              </div>
            </div>
          </div>

          {/* Audio Player with Waveform */}
          <AudioPlayer
            src={beat.audioTaggedUrl}
            title={beat.title}
            previewOnly={!hasPurchased}
            beatId={id}
            showWaveform
          />

          {/* Tags */}
          {beat.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {beat.tags.map((tag) => (
                <Link key={tag} href={`/marketplace?search=${encodeURIComponent(tag)}`}>
                  <Badge
                    variant="secondary"
                    className="text-xs transition-colors hover:bg-primary/20"
                  >
                    #{tag}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {/* Description */}
          {beat.description && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                {beat.description}
              </p>
            </div>
          )}

          {/* Download section (purchased users) */}
          {hasPurchased && <DownloadPanel beatId={id} />}

          <Separator />

          {/* Producer Info Card */}
          {producer && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                About the Producer
              </h2>
              <Card className="border-border/50 bg-card/80">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Link
                      href={
                        producer.username
                          ? `/producer/${producer.username}`
                          : "#"
                      }
                    >
                      <Avatar className="h-14 w-14">
                        {(producer.avatarUrl || producer.image) && (
                          <AvatarImage
                            src={producer.avatarUrl || producer.image}
                            alt={producer.displayName || producer.name}
                          />
                        )}
                        <AvatarFallback className="bg-primary/20 text-primary text-lg">
                          {producerInitials}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={
                            producer.username
                              ? `/producer/${producer.username}`
                              : "#"
                          }
                          className="font-semibold hover:text-primary"
                        >
                          {producer.displayName || producer.name}
                        </Link>
                        {producer.verified && (
                          <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                      {producer.username && (
                        <p className="text-sm text-muted-foreground">
                          @{producer.username}
                        </p>
                      )}
                      {producer.bio && (
                        <p className="mt-2 text-sm text-foreground/70 line-clamp-2">
                          {producer.bio}
                        </p>
                      )}
                      {producer.genres && producer.genres.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {producer.genres.slice(0, 4).map((g) => (
                            <Badge
                              key={g}
                              variant="secondary"
                              className="text-xs"
                            >
                              {g}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{producer.salesCount ?? 0} sales</span>
                        <span>{producer.followersCount ?? 0} followers</span>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0">
                      <Link
                        href={
                          producer.username
                            ? `/producer/${producer.username}`
                            : "#"
                        }
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Profile
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* ====================== RIGHT COLUMN ====================== */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <LicenseSelector
            licenses={JSON.parse(JSON.stringify(licenses))}
            beatId={id}
            beatTitle={beat.title}
            isLoggedIn={!!session?.user}
            hasPurchased={hasPurchased}
          />
        </div>
      </div>

      {/* Related Beats */}
      {relatedWithPrices.length > 0 && (
        <div className="mt-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold">You Might Also Like</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/marketplace?genre=${encodeURIComponent(beat.genre)}`}>
                More {beat.genre}
                <ArrowLeft className="ml-1 h-4 w-4 rotate-180" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {relatedWithPrices.map(({ beat: rb, startingPrice }) => (
              <BeatCard
                key={rb._id.toString()}
                beat={rb}
                startingPrice={startingPrice}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
