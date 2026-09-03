import type { AttributionSource } from "@/types";
import type { FunnelDays } from "@/lib/validators/analytics";

export interface FunnelAnalyticsInput {
  days: FunnelDays;
  from: Date;
  to: Date;
  funnel: { plays: number; pdpViews: number; checkouts: number; paid: number };
  bySource: {
    source: AttributionSource;
    plays: number;
    paid: number;
    earnings: number;
  }[];
  byBeat: {
    beatId: string;
    title: string;
    plays: number;
    paid: number;
    pdpViews: number;
    conversion: number;
  }[];
  highPlayZeroSales: { beatId: string; title: string; plays: number }[];
}

export interface FunnelAnalyticsDto {
  days: FunnelDays;
  from: string;
  to: string;
  funnel: { plays: number; pdpViews: number; checkouts: number; paid: number };
  bySource: {
    source: AttributionSource;
    plays: number;
    paid: number;
    earnings: number;
  }[];
  byBeat: {
    beatId: string;
    title: string;
    plays: number;
    paid: number;
    pdpViews: number;
    conversion: number;
  }[];
  highPlayZeroSales: { beatId: string; title: string; plays: number }[];
}

export function toFunnelAnalyticsDto(
  input: FunnelAnalyticsInput
): FunnelAnalyticsDto {
  return {
    days: input.days,
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    funnel: input.funnel,
    bySource: input.bySource,
    byBeat: input.byBeat,
    highPlayZeroSales: input.highPlayZeroSales,
  };
}
