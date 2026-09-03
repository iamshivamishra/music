import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PackageOpen } from "lucide-react";
import { auth } from "@/lib/auth";
import { packService } from "@/lib/services/pack.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import PackDetailClient from "./PackDetailClient";
import PackTrackList from "./PackTrackList";
import { serializeLean } from "@/lib/serializers/lean";
import { toPlayableBeat } from "@/features/beats/playable-beat";

export const revalidate = 60;

interface PackPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PackPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const meta = await packService.getMetadata(slug);
    if (!meta) return { title: "Pack Not Found" };
    return {
      title: `${meta.pack.title} — Beat Pack by ${meta.producerName}`,
      description: meta.pack.description || `${meta.pack.title} beat pack with ${meta.pack.beats.length} beats.`,
    };
  } catch {
    return { title: "Pack Not Found" };
  }
}

export default async function PackDetailPage({ params }: PackPageProps) {
  const { slug } = await params;
  const session = await auth();

  let data;
  try {
    data = await packService.getDetailPageData(
      slug,
      session?.user?.id,
      session?.user?.role
    );
  } catch {
    notFound();
  }

  const { pack, orderedBeats, producer, producerName, hasPurchased, existingPurchase } = data;
  const activeTiers = pack.tiers.filter((t) => t.isActive);

  return (
    <div className="page-shell px-4 pb-20 sm:px-6 lg:px-8 lg:pb-0">
      <Button asChild variant="ghost" size="sm" className="mb-6 sm:mb-8">
        <Link href="/beat-packs">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Beat Packs
        </Link>
      </Button>

      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary">
                <PackageOpen className="mr-1 h-3 w-3" />
                Beat Pack
              </Badge>
              <Badge variant="secondary">{pack.genre}</Badge>
              <Badge variant="outline">{pack.beats.length} beats</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{pack.title}</h1>
            {producer && (
              <p className="mt-1 text-muted-foreground">
                by{" "}
                {producer.username ? (
                  <Link
                    href={`/producer/${producer.username}`}
                    className="text-foreground hover:text-primary hover:underline"
                  >
                    {producerName}
                  </Link>
                ) : (
                  producerName
                )}
              </p>
            )}
          </div>

          {/* Cover gallery */}
          {pack.coverImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pack.coverImages.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`${pack.title} cover ${i + 1}`}
                  className="h-48 w-48 shrink-0 rounded-lg object-cover sm:h-56 sm:w-56"
                />
              ))}
            </div>
          )}

          {/* Description */}
          {pack.description && (
            <Card className="border-border/50 bg-card/60">
              <CardContent className="p-4 sm:p-5">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  About this Pack
                </h2>
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground/80">
                  {pack.description}
                </p>
              </CardContent>
            </Card>
          )}

          <Separator />

          <PackTrackList
            packId={pack._id.toString()}
            tracks={orderedBeats.map((b) => ({
              beat: { ...toPlayableBeat(b), packId: pack._id.toString() },
              genre: b.genre,
              bpm: b.bpm,
              key: b.key,
              duration: b.duration,
            }))}
          />
        </div>

        {/* Right column: tier picker + buy */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <PackDetailClient
            packId={pack._id.toString()}
            packTitle={pack.title}
            tiers={serializeLean(activeTiers)}
            hasPurchased={hasPurchased}
            existingTier={existingPurchase?.packTier}
            existingAmount={existingPurchase?.amount}
            isLoggedIn={!!session?.user}
          />
        </div>
      </div>
    </div>
  );
}
