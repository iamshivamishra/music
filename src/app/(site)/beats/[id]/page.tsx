import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { beatEventService } from "@/lib/services/beat-event.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import LicenseSelector from "@/features/beats/license/LicenseSelector";
import DownloadPanel from "@/components/DownloadPanel";
import FreeDownloadCard from "@/features/beats/FreeDownloadCard";
import BeatHeroCard from "@/features/beats/BeatHeroCard";
import BeatProducerCard from "@/features/beats/BeatProducerCard";
import BeatQueueGrid from "@/features/beats/BeatQueueGrid";
import { UnlistedUnlock } from "@/components/UnlistedUnlock";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { resolveUnlistedAccessToken } from "@/lib/unlisted-token";

export const dynamic = "force-dynamic";

interface BeatPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}

async function resolvePageToken(id: string, searchToken?: string) {
  return resolveUnlistedAccessToken({
    beatId: id,
    queryToken: searchToken,
  });
}

export async function generateMetadata({
  params,
  searchParams,
}: BeatPageProps): Promise<Metadata> {
  const { id } = await params;
  const { t } = await searchParams;
  const accessToken = await resolvePageToken(id, t);
  const session = await auth();
  const meta = await beatService.getMetadata(id, {
    userId: session?.user?.id,
    userRole: session?.user?.role,
    accessToken,
  });
  if (!meta) return { title: "Beat Not Found" };

  return {
    title: meta.title,
    description: meta.description,
    robots: meta.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: `${meta.title} — Trishul Beats`,
      description: `${meta.genre} beat at ${meta.bpm || "—"} BPM. License now.`,
      images: meta.coverUrl ? [meta.coverUrl] : [],
      type: "music.song",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: meta.coverUrl ? [meta.coverUrl] : [],
    },
    alternates: {
      canonical: meta.noindex ? undefined : meta.canonicalUrl,
    },
  };
}

export default async function BeatPage({ params, searchParams }: BeatPageProps) {
  const { id } = await params;
  const { t } = await searchParams;
  const session = await auth();
  const accessToken = await resolvePageToken(id, t);

  const data = await beatService.getDetailPageData(
    id,
    session?.user?.id,
    session?.user?.role,
    accessToken
  );
  if (!data) notFound();

  const {
    beat,
    licenses,
    producer,
    producerName,
    relatedBeats: relatedWithPrices,
    hasPurchased,
    initialLiked,
    canLike,
    canViewUnpublished,
    isOwner,
    beatJsonLd,
    showFreeDownload,
  } = data;

  const cookieStore = await cookies();
  after(() => {
    void beatEventService.recordPdpView(id, cookieStore, beat.producerId.toString());
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const shareUrl = `${appUrl}/beats/${id}`;

  const showEmbed = isOwner || session?.user?.role === "admin";

  return (
    <div className="page-shell px-4 sm:px-6 lg:px-8">
      {t ? <UnlistedUnlock beatId={id} token={t} /> : null}
      {beatJsonLd && (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(beatJsonLd) }}
      />
      )}
      <Button asChild variant="ghost" size="sm" className="mb-6 sm:mb-8">
        <Link href="/beats">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Beats
        </Link>
      </Button>

      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <BeatHeroCard
            beat={beat}
            producer={producer}
            audioSrc={beat.audioTaggedUrl}
            beatId={id}
            shareUrl={shareUrl}
            showEmbed={showEmbed}
            showCreateOffer={isOwner && isFeatureEnabled("customOffers")}
            interaction={{
              hasPurchased,
              canViewUnpublished,
              initialLiked,
              isLoggedIn: !!session?.user,
              canLike,
            }}
          />

          {beat.tags.length > 0 && (
            <Card className="border-border/50 bg-card/60">
              <CardContent className="p-4 sm:p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {beat.tags.map((tag: string) => (
                    <Link key={tag} href={`/beats?search=${encodeURIComponent(tag)}`}>
                      <Badge
                        variant="secondary"
                        className="text-xs transition-colors hover:bg-primary/20"
                      >
                        #{tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {beat.description && (
            <Card className="border-border/50 bg-card/60">
              <CardContent className="p-4 sm:p-5">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </h2>
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground/80">
                  {beat.description}
                </p>
              </CardContent>
            </Card>
          )}

          {hasPurchased && <DownloadPanel beatId={id} />}

          <Separator />

          {producer && (
            <BeatProducerCard producer={producer} beatTitle={beat.title} />
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
          {showFreeDownload && (
              <FreeDownloadCard
                beatId={id}
                producerName={producerName ?? "this producer"}
                prefillEmail={session?.user?.email}
              />
            )}
          <LicenseSelector
            licenses={licenses}
            beatId={id}
            beatTitle={beat.title}
            isLoggedIn={!!session?.user}
            hasPurchased={hasPurchased}
            exclusiveSold={Boolean(beat.exclusiveBuyerId)}
            unlisted={beat.status === "unlisted"}
            accessToken={accessToken}
          />
        </div>
      </div>

      {relatedWithPrices.length > 0 && (
        <div className="mt-12 sm:mt-16">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 sm:mb-6">
            <h2 className="text-lg font-bold sm:text-xl">You Might Also Like</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/beats?genre=${encodeURIComponent(beat.genre)}`}>
                More {beat.genre}
                <ArrowLeft className="ml-1 h-4 w-4 rotate-180" />
              </Link>
            </Button>
          </div>
          <BeatQueueGrid
            items={relatedWithPrices}
            className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          />
        </div>
      )}
    </div>
  );
}
