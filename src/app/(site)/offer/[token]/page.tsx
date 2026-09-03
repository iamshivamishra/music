import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Check, FileAudio, FileArchive, Briefcase, Radio, Music } from "lucide-react";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import { offerService } from "@/lib/services/offer.service";
import { Card, CardContent } from "@/components/ui/card";
import OfferCheckoutClient from "./OfferCheckoutClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  requireFeaturePage("customOffers");
  const { token } = await params;
  const offer = await offerService.getPublicByToken(token);
  if (!offer) return { title: "Offer not found", robots: { index: false, follow: false } };

  return {
    title: `Offer — ${offer.beat.title}`,
    robots: { index: false, follow: false },
  };
}

function streamLimitLabel(limit: number): string {
  if (limit <= 0 || limit === -1) return "Unlimited";
  if (limit >= 1000) return `${(limit / 1000).toFixed(0)}K streams`;
  return `${limit} streams`;
}

export default async function PublicOfferPage({ params }: Props) {
  requireFeaturePage("customOffers");
  const { token } = await params;
  const session = await auth();
  const offer = await offerService.getPublicByToken(token);
  if (!offer) notFound();

  const snapshot = offer.licenseSnapshot;

  return (
    <div className="page-shell max-w-xl">
      <div className="page-header">
        <h1 className="page-title">Custom offer</h1>
        <p className="text-muted-foreground">
          Private price from {offer.producerName}
        </p>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-primary/10">
              {offer.beat.coverUrl ? (
                <Image
                  src={offer.beat.coverUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Music className="h-8 w-8 text-primary/40" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{offer.beat.title}</h2>
              <p className="text-sm text-muted-foreground">{offer.beat.genre}</p>
              <p className="mt-2 text-2xl font-bold">
                ₹{offer.amount.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {snapshot.name}
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" aria-hidden="true" />
                MP3 file
              </li>
              <li className="flex items-center gap-2">
                <FileAudio className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                WAV file: {snapshot.includesWav ? "Yes" : "No"}
              </li>
              <li className="flex items-center gap-2">
                <FileArchive className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                Stems: {snapshot.includesStems ? "Yes" : "No"}
              </li>
              <li className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                Commercial use: {snapshot.commercialUse ? "Yes" : "No"}
              </li>
              <li className="flex items-center gap-2">
                <Radio className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {streamLimitLabel(snapshot.streamLimit)}
              </li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {snapshot.terms}
            </p>
          </div>

          <OfferCheckoutClient
            token={offer.token}
            amount={offer.amount}
            beatTitle={offer.beat.title}
            licenseName={snapshot.name}
            expiresAt={offer.expiresAt}
            isLoggedIn={!!session?.user}
            status={offer.status}
          />
        </CardContent>
      </Card>
    </div>
  );
}
