import { beatEventService } from "@/lib/services/beat-event.service";
import type { IOrder, IOrderAttribution } from "@/types";

export function withAttribution(
  data: Partial<IOrder>,
  attribution?: IOrderAttribution
): Partial<IOrder> {
  return attribution ? { ...data, attribution } : data;
}

export function trackCheckoutStart(
  order: IOrder,
  attribution?: IOrderAttribution
): void {
  beatEventService.recordCheckoutStarts(
    order.items,
    attribution?.source ?? "direct"
  );
}
