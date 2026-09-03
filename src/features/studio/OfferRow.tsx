"use client";

import { Copy, MessageCircle, Ban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { buildOfferPayText, buildWhatsAppShareUrl } from "@/lib/utils/whatsapp";
import type { StudioOfferDto } from "@/lib/serializers/offer";

const STATUS_LABEL: Record<string, string> = {
  pending_request: "Request",
  open: "Open",
  accepted: "Accepted",
  expired: "Expired",
  withdrawn: "Withdrawn",
};

interface OfferRowProps {
  offer: StudioOfferDto;
  actionLoading: boolean;
  onCopy: (url: string) => void;
  onWithdraw: (offer: StudioOfferDto) => void;
  onConvert: (offer: StudioOfferDto) => void;
}

export function OfferRow({
  offer,
  actionLoading,
  onCopy,
  onWithdraw,
  onConvert,
}: OfferRowProps) {
  const canWithdraw = offer.status === "open" || offer.status === "pending_request";
  const payUrl = offer.payUrl;

  return (
    <TableRow>
      <TableCell className="font-medium">{offer.beat.title}</TableCell>
      <TableCell>
        <Badge variant="secondary">{STATUS_LABEL[offer.status] ?? offer.status}</Badge>
      </TableCell>
      <TableCell>
        {offer.amount != null ? `₹${offer.amount.toLocaleString("en-IN")}` : "—"}
      </TableCell>
      <TableCell className="hidden sm:table-cell">{offer.licenseName}</TableCell>
      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
        {offer.requesterEmail || "—"}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
        {offer.expiresAt
          ? new Date(offer.expiresAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {offer.status === "pending_request" && (
            <Button size="sm" onClick={() => onConvert(offer)} disabled={actionLoading}>
              Send link
            </Button>
          )}
          {payUrl && (
            <>
              <Button
                variant="outline"
                size="sm"
                aria-label="Copy pay link"
                onClick={() => onCopy(payUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={buildWhatsAppShareUrl(
                    buildOfferPayText({
                      beatTitle: offer.beat.title,
                      amount: offer.amount ?? 0,
                      licenseName: offer.licenseName,
                      url: payUrl,
                    })
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Send on WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </Button>
            </>
          )}
          {canWithdraw && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Withdraw offer"
              disabled={actionLoading}
              onClick={() => onWithdraw(offer)}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ban className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
