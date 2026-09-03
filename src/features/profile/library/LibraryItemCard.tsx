import Image from "next/image";
import { Music, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tierAccent } from "@/lib/license-ui";
import { DownloadButton } from "./DownloadButton";
import type { LibraryItem } from "@/lib/serializers/library";

export function LibraryItemCard({ item }: { item: LibraryItem }) {
  const tierColorClass = tierAccent(item.licenseType);
  const formattedDate = new Date(item.purchasedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <article className="rounded-xl border border-border/50 bg-card/70 backdrop-blur-sm transition-colors hover:bg-card/90">
      <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-16 sm:w-16">
          {item.coverUrl ? (
            <Image
              src={item.coverUrl}
              alt=""
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold sm:text-base">
                {item.beatTitle}
              </h3>
              <p className="truncate text-xs text-muted-foreground">
                {item.producerName}
                {item.genre && (
                  <span className="ml-1.5 text-muted-foreground/70">
                    &middot; {item.genre}
                  </span>
                )}
              </p>
            </div>
            <p className="shrink-0 text-sm font-bold">
              ₹{item.amount.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`capitalize text-[11px] ${tierColorClass} border-current/25`}
            >
              {item.licenseType}
            </Badge>
            <time
              dateTime={item.purchasedAt}
              className="text-[11px] text-muted-foreground"
            >
              {formattedDate}
            </time>
          </div>
        </div>
      </div>

      <div className="border-t border-border/30 px-3 py-3 sm:px-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Downloads
        </p>
        <div className="flex flex-wrap gap-2">
          <DownloadButton
            purchaseId={item.purchaseId}
            type="preview"
            label="MP3"
            available
          />
          <DownloadButton
            purchaseId={item.purchaseId}
            type="master"
            label="WAV"
            available={item.includesWav}
            upgradeTier={!item.includesWav ? "Premium" : undefined}
          />
          <DownloadButton
            purchaseId={item.purchaseId}
            type="stems"
            label="Stems"
            available={item.includesStems}
            upgradeTier={!item.includesStems ? "Unlimited" : undefined}
          />
          <Button
            asChild
            variant="outline"
            size="sm"
            className="min-h-11 gap-1.5 text-xs sm:min-h-9"
          >
            <a
              href={`/api/purchases/${item.purchaseId}/license-pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="h-3 w-3" aria-hidden="true" />
              License
            </a>
          </Button>
        </div>
        {item.isDeleted && (
          <p className="mt-2 text-xs text-muted-foreground">
            This beat has been removed from the marketplace. Downloads still
            work if files exist.
          </p>
        )}
      </div>
    </article>
  );
}
