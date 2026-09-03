"use client";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OfferRow } from "@/features/studio/OfferRow";
import type { StudioOfferDto } from "@/lib/serializers/offer";

interface OffersTableProps {
  offers: StudioOfferDto[];
  actionLoading: string | null;
  onCopy: (url: string) => void;
  onWithdraw: (offer: StudioOfferDto) => Promise<void>;
  onConvert: (offer: StudioOfferDto) => void;
}

export function OffersTable({
  offers,
  actionLoading,
  onCopy,
  onWithdraw,
  onConvert,
}: OffersTableProps) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/50 bg-card/80 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Beat</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="hidden sm:table-cell">License</TableHead>
            <TableHead className="hidden md:table-cell">Buyer</TableHead>
            <TableHead className="hidden lg:table-cell">Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              actionLoading={actionLoading === offer.id}
              onCopy={onCopy}
              onWithdraw={onWithdraw}
              onConvert={onConvert}
            />
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
