import Link from "next/link";
import { Briefcase } from "lucide-react";
import { SERVICE_TYPE_LABELS, type PublicServiceListingDto } from "@/lib/serializers/service-listing";

interface Props {
  listings: PublicServiceListingDto[];
}

export default function ProducerServicesSection({ listings }: Props) {
  if (listings.length === 0) return null;

  return (
    <section aria-labelledby="services-heading">
      <h2 id="services-heading" className="mb-4 text-xl font-bold">
        Services{" "}
        <span className="text-muted-foreground font-normal text-base">
          ({listings.length})
        </span>
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {listings.map((listing) => (
          <li key={listing.id}>
            <Link
              href={`/services/${listing.id}`}
              className="flex h-full flex-col rounded-xl border border-border/50 bg-card/80 p-4 transition-colors hover:bg-accent"
            >
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                {SERVICE_TYPE_LABELS[listing.type]}
              </div>
              <p className="font-medium">{listing.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {listing.description}
              </p>
              <p className="mt-3 text-sm font-semibold">
                From ₹{listing.startingPrice.toLocaleString("en-IN")} ·{" "}
                {listing.turnaroundDays} day{listing.turnaroundDays === 1 ? "" : "s"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
