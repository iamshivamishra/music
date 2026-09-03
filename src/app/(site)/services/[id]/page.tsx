import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, Clock, MessageCircle, Wallet } from "lucide-react";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import { serviceListingService } from "@/lib/services/service-listing.service";
import { SERVICE_TYPE_LABELS } from "@/lib/serializers/service-listing";
import {
  buildServiceInquireText,
  buildWhatsAppInquireUrl,
} from "@/lib/utils/whatsapp";
import { getAppUrl } from "@/lib/app-url";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ServiceBriefForm from "@/features/services/ServiceBriefForm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  requireFeaturePage("customServices");
  const { id } = await params;
  const listing = await serviceListingService.getPublishedById(id);
  if (!listing) return { title: "Service Not Found" };
  const producer = listing.producerName || "a producer";
  return {
    title: `${listing.title} — ${SERVICE_TYPE_LABELS[listing.type]}`,
    description:
      listing.description.slice(0, 160) ||
      `${SERVICE_TYPE_LABELS[listing.type]} by ${producer} on Trishul Beats.`,
    alternates: { canonical: `${getAppUrl()}/services/${listing.id}` },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  requireFeaturePage("customServices");
  const { id } = await params;
  const listing = await serviceListingService.getPublishedById(id);
  if (!listing) notFound();

  const session = await auth();
  const inquireUrl = buildWhatsAppInquireUrl(
    listing.whatsappNumber,
    buildServiceInquireText(listing.title)
  );
  const depositAmount = Math.max(
    1,
    Math.round((listing.startingPrice * listing.depositPercent) / 100)
  );
  const isOwnListing = session?.user?.id === listing.producerId;

  return (
    <div className="page-shell max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link
          href={
            listing.producerUsername
              ? `/producer/${listing.producerUsername}`
              : "/beats"
          }
        >
          <ArrowLeft className="h-4 w-4" />
          Back to producer
        </Link>
      </Button>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          <Briefcase className="h-3 w-3" aria-hidden="true" />
          {SERVICE_TYPE_LABELS[listing.type]}
        </Badge>
        {listing.producerUsername && (
          <Link
            href={`/producer/${listing.producerUsername}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {listing.producerName || listing.producerUsername}
          </Link>
        )}
      </div>

      <h1 className="page-title">{listing.title}</h1>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {listing.description}
      </p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-card/80 p-4">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
            Starting price
          </dt>
          <dd className="mt-1 text-lg font-semibold">
            ₹{listing.startingPrice.toLocaleString("en-IN")}
          </dd>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/80 p-4">
          <dt className="text-xs text-muted-foreground">Deposit to book</dt>
          <dd className="mt-1 text-lg font-semibold">
            {listing.depositPercent}% · ₹{depositAmount.toLocaleString("en-IN")}
          </dd>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/80 p-4">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Turnaround
          </dt>
          <dd className="mt-1 text-lg font-semibold">
            {listing.turnaroundDays} day{listing.turnaroundDays === 1 ? "" : "s"}
          </dd>
        </div>
      </dl>

      {listing.extras.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium">Optional extras</h2>
          <ul className="space-y-2">
            {listing.extras.map((extra) => (
              <li
                key={extra.name}
                className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm"
              >
                <span>{extra.name}</span>
                <span className="font-medium">
                  +₹{extra.price.toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        The deposit is prepaid for work, not held in escrow beyond Razorpay
        settlement. Remaining balance unlocks the delivery files.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {inquireUrl && (
          <Button
            asChild
            variant="outline"
            className="border-success-text/30 text-success-text hover:bg-success-bg hover:text-success-text"
          >
            <a
              href={inquireUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discuss on WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
              Discuss on WhatsApp
            </a>
          </Button>
        )}
      </div>

      {!isOwnListing && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Book this service</h2>
          <ServiceBriefForm
            listingId={listing.id}
            extras={listing.extras}
            startingPrice={listing.startingPrice}
            depositPercent={listing.depositPercent}
            isLoggedIn={!!session?.user}
          />
        </div>
      )}
    </div>
  );
}
