import Link from "next/link";
import { ExternalLink, MessageCircle } from "lucide-react";
import {
  buildBeatInquireText,
  buildProfileInquireText,
  buildWhatsAppInquireUrl,
} from "@/lib/utils/whatsapp";
import { FoundingBadge } from "@/components/FoundingBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { IUser } from "@/types";

type ProducerData = Pick<
  IUser,
  | "displayName"
  | "name"
  | "username"
  | "bio"
  | "avatarUrl"
  | "image"
  | "genres"
  | "verified"
  | "producerTier"
  | "salesCount"
  | "followersCount"
  | "socialLinks"
>;

interface BeatProducerCardProps {
  producer: ProducerData;
  beatTitle?: string;
}

export default function BeatProducerCard({ producer, beatTitle }: BeatProducerCardProps) {
  const initials = (producer.displayName || producer.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const profileHref = producer.username
    ? `/producer/${producer.username}`
    : "#";

  const inquireText = beatTitle
    ? buildBeatInquireText(beatTitle)
    : buildProfileInquireText();
  const inquireUrl = buildWhatsAppInquireUrl(
    producer.socialLinks?.whatsappNumber,
    inquireText
  );

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        About the Producer
      </h2>
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
            <Link href={profileHref} className="shrink-0">
              <Avatar className="h-14 w-14">
                {(producer.avatarUrl || producer.image) && (
                  <AvatarImage
                    src={producer.avatarUrl || producer.image}
                    alt={producer.displayName || producer.name}
                  />
                )}
                <AvatarFallback className="bg-primary/20 text-primary text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 w-full flex-1">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Link
                  href={profileHref}
                  className="font-semibold hover:text-primary"
                >
                  {producer.displayName || producer.name}
                </Link>
                {producer.verified && (
                  <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                    Verified
                  </Badge>
                )}
                {producer.producerTier === "founding" && <FoundingBadge />}
              </div>
              {producer.username && (
                <p className="text-sm text-muted-foreground">
                  @{producer.username}
                </p>
              )}
              {producer.bio && (
                <p className="mt-2 text-sm text-foreground/70 line-clamp-2 break-words">
                  {producer.bio}
                </p>
              )}
              {producer.genres && producer.genres.length > 0 && (
                <div className="mt-2 flex flex-wrap justify-center gap-1 sm:justify-start">
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
              <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground sm:justify-start">
                <span>{producer.salesCount ?? 0} sales</span>
                <span>{producer.followersCount ?? 0} followers</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 w-full sm:w-auto">
              <Button asChild variant="outline" size="sm" className="min-h-11 w-full">
                <Link href={profileHref}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Profile
                </Link>
              </Button>
              {inquireUrl && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="min-h-11 w-full border-success-text/30 text-success-text hover:bg-success-bg hover:text-success-text"
                >
                  <a
                    href={inquireUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={
                      beatTitle
                        ? `Inquire about ${beatTitle} on WhatsApp`
                        : "Inquire on WhatsApp"
                    }
                  >
                    <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                    Inquire on WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
