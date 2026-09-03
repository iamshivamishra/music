import Image from "next/image";
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  MessageCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import FollowButton from "@/components/FollowButton";
import { FoundingBadge } from "@/components/FoundingBadge";
import ShareStoreButton from "./ShareStoreButton";
import type { PublicProducer } from "@/lib/serializers/producer";

interface ProducerStoreHeroProps {
  producer: PublicProducer;
  displayName: string;
  initials: string;
  inquireUrl: string | null;
  storeUrl: string;
}

function SocialIcon({ platform }: { platform: string }) {
  if (platform === "website") return <Globe className="h-4 w-4" />;
  return <ExternalLink className="h-4 w-4" />;
}

function socialLabel(platform: string): string {
  const labels: Record<string, string> = {
    instagram: "Instagram",
    youtube: "YouTube",
    twitter: "Twitter / X",
    website: "Website",
    spotify: "Spotify",
    soundcloud: "SoundCloud",
  };
  return labels[platform] || platform;
}

export default function ProducerStoreHero({
  producer,
  displayName,
  initials,
  inquireUrl,
  storeUrl,
}: ProducerStoreHeroProps) {
  const headline = producer.store.headline;

  return (
    <>
      <div className="relative h-48 w-full bg-gradient-to-br from-primary/30 via-primary/10 to-background sm:h-64 lg:h-72">
        {producer.coverImageUrl && (
          <Image
            src={producer.coverImageUrl}
            alt={`${displayName} cover`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="relative -mt-16 flex flex-col items-center gap-4 sm:-mt-20 sm:flex-row sm:items-end sm:gap-6">
        <Avatar className="h-28 w-28 border-4 border-background shadow-xl sm:h-36 sm:w-36">
          {producer.avatarUrl ? (
            <AvatarImage src={producer.avatarUrl} alt={displayName} />
          ) : producer.image ? (
            <AvatarImage src={producer.image} alt={displayName} />
          ) : null}
          <AvatarFallback className="bg-primary/20 text-primary text-4xl">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 text-center sm:pb-2 sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl font-semibold sm:text-3xl">{displayName}</h1>
            {producer.verified && (
              <CheckCircle2 className="h-5 w-5 fill-primary text-primary-foreground" />
            )}
            {producer.producerTier === "founding" && (
              <FoundingBadge variant="full" />
            )}
          </div>
          <p className="text-muted-foreground">@{producer.username}</p>
          {headline && (
            <p className="mt-1 max-w-xl text-sm font-medium text-foreground">{headline}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        <FollowButton producerId={producer.id} />
        {inquireUrl && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="min-h-11 border-success-text/30 text-success-text hover:bg-success-bg hover:text-success-text sm:min-h-8"
          >
            <a
              href={inquireUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Message on WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </Button>
        )}
        {producer.username && (
          <ShareStoreButton displayName={displayName} storeUrl={storeUrl} />
        )}
      </div>
    </>
  );
}

export function ProducerSocialLinks({
  entries,
}: {
  entries: Array<[string, string]>;
}) {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([platform, url]) => (
        <a
          key={platform}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <SocialIcon platform={platform} />
          {socialLabel(platform)}
        </a>
      ))}
    </div>
  );
}
