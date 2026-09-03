import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Music, Play, Users } from "lucide-react";
import { producerService } from "@/lib/services/producer.service";
import type { ProducerProfileData } from "@/lib/serializers/store";
import { getAppUrl } from "@/lib/app-url";
import { buildProfileInquireText, buildWhatsAppInquireUrl } from "@/lib/utils/whatsapp";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PackCard from "@/components/PackCard";
import ProducerBeatsGrid from "./ProducerBeatsGrid";
import OwnerActions, { OwnerEmptyHint } from "./OwnerActions";
import PinnedBeats from "./PinnedBeats";
import ProducerStoreHero, { ProducerSocialLinks } from "./ProducerStoreHero";
import ProducerProfileJsonLd from "./ProducerProfileJsonLd";
import ProducerServicesSection from "@/features/services/ProducerServicesSection";

export const revalidate = 300;

const getCachedProfile = cache(
  async (username: string): Promise<ProducerProfileData | null> => {
    return producerService.getProfileData(username);
  }
);

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const data = await getCachedProfile(username);
  if (!data) return { title: "Producer Not Found" };

  const { producer } = data;
  const appUrl = getAppUrl();
  const displayName = producer.displayName || producer.name;
  const description =
    producer.store.headline ||
    producer.bio ||
    `Check out beats by ${displayName} on Trishul Beats.`;
  const ogImage = producer.avatarUrl || `${appUrl}/og-default.png`;

  return {
    title: `${displayName} (@${producer.username})`,
    description,
    openGraph: {
      title: `${displayName} — Trishul Beats`,
      description,
      images: [ogImage],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} — Trishul Beats`,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `${appUrl}/producer/${producer.username}`,
    },
  };
}

export default async function ProducerProfilePage({ params }: Props) {
  const { username } = await params;
  const data = await getCachedProfile(username);
  if (!data) notFound();

  const { producer, beats, pinned, featuredPack, catalog, totalPlays, services } = data;
  const appUrl = getAppUrl();
  const storeUrl = `${appUrl}/p/${producer.username}`;
  const displayName = producer.displayName || producer.name;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const socialEntries = Object.entries(producer.socialLinks || {}).filter(
    ([key, url]) => key !== "whatsappNumber" && url && url.length > 0
  ) as Array<[string, string]>;
  const inquireUrl = producer.store.showWhatsApp
    ? buildWhatsAppInquireUrl(
        producer.socialLinks?.whatsappNumber,
        buildProfileInquireText()
      )
    : null;

  return (
    <div>
      <ProducerProfileJsonLd
        producer={producer}
        displayName={displayName}
        appUrl={appUrl}
        socialUrls={socialEntries.map(([, url]) => url)}
      />

      <ProducerStoreHero
        producer={producer}
        displayName={displayName}
        initials={initials}
        inquireUrl={inquireUrl}
        storeUrl={storeUrl}
      />

      <div className="app-container max-w-5xl">
        <div className="relative mt-6 flex items-center justify-center gap-6 text-center sm:justify-start sm:gap-10">
          <div>
            <p className="text-xl font-bold">{beats.length}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Music className="h-3 w-3" /> Beats
            </p>
          </div>
          <div>
            <p className="text-xl font-bold">{totalPlays.toLocaleString()}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Play className="h-3 w-3" /> Plays
            </p>
          </div>
          <div>
            <p className="text-xl font-bold">{producer.followersCount ?? 0}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Followers
            </p>
          </div>
          <OwnerActions
            producerId={producer.id}
            salesCount={producer.salesCount ?? 0}
            username={producer.username || ""}
          />
        </div>

        <div className="mt-6 space-y-4">
          {producer.bio && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {producer.bio}
            </p>
          )}
          {producer.genres && producer.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {producer.genres.map((g) => (
                <Badge key={g} variant="secondary" className="text-xs">
                  {g}
                </Badge>
              ))}
            </div>
          )}
          <ProducerSocialLinks entries={socialEntries} />
        </div>

        <Separator className="my-8" />

        <div className="space-y-10 pb-16">
          <ProducerServicesSection listings={services} />
          {pinned.length > 0 && <PinnedBeats items={pinned} />}

          {featuredPack && (
            <section aria-labelledby="featured-pack-heading">
              <h2 id="featured-pack-heading" className="mb-4 text-xl font-bold">
                Featured pack
              </h2>
              <div className="max-w-xs">
                <PackCard
                  pack={{
                    ...featuredPack,
                    _id: featuredPack._id.toString(),
                  }}
                />
              </div>
            </section>
          )}

          {catalog.length > 0 && (
            <section aria-labelledby="all-beats-heading">
              <h2 id="all-beats-heading" className="mb-6 text-xl font-bold">
                All beats{" "}
                <span className="text-muted-foreground font-normal text-base">
                  ({catalog.length})
                </span>
              </h2>
              <ProducerBeatsGrid items={catalog} />
            </section>
          )}

          {beats.length === 0 && (
            <div className="py-20 text-center text-muted-foreground">
              <Music className="mx-auto mb-2 h-12 w-12" />
              <p className="text-lg font-medium">No beats published yet</p>
              <OwnerEmptyHint producerId={producer.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
