"use client";

import { Handshake, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OfferListTab } from "@/types";

const EMPTY_COPY: Record<OfferListTab, string> = {
  requests: "No price requests",
  open: "No open offers",
  closed: "No closed offers",
};

interface OffersEmptyCardProps {
  currentTab: OfferListTab;
  onCreate: () => void;
}

export function OffersEmptyCard({ currentTab, onCreate }: OffersEmptyCardProps) {
  return (
    <Card className="rounded-2xl border-border/50 bg-card/60 shadow-sm">
      <CardContent className="flex flex-col items-center py-16">
        <Handshake className="mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">{EMPTY_COPY[currentTab]}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a pay link after you agree a price on WhatsApp.
        </p>
        {currentTab === "open" && (
          <Button className="mt-4" onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create offer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
