import type { IOrder, IOrderItem, OrderStatus } from "@/types";

export interface CreatedCheckoutOrder {
  orderId: string;
  amount: number;
  currency: string;
  internalOrderId: string;
}

export interface CheckoutOrderItemDto {
  kind: "beat" | "pack" | "service";
  title: string;
  tier?: string;
  price: number;
  serviceJobId?: string;
}

export interface CheckoutOrderDto {
  id: string;
  receipt: string;
  status: OrderStatus;
  totalAmount: number;
  subtotalAmount?: number;
  discountAmount: number;
  couponCode?: string;
  items: CheckoutOrderItemDto[];
}

function itemKind(item: IOrderItem): "beat" | "pack" | "service" {
  if (item.kind === "service_deposit" || item.kind === "service_balance") return "service";
  return item.packId ? "pack" : "beat";
}

function itemTitle(item: IOrderItem): string {
  return item.serviceTitle || item.packTitle || item.beatTitle || "Item";
}

function itemTier(item: IOrderItem): string | undefined {
  if (item.kind === "service_deposit") return "Deposit";
  if (item.kind === "service_balance") return "Balance";
  return item.packTier || item.licenseType;
}

export function toCheckoutOrderDto(order: IOrder): CheckoutOrderDto {
  return {
    id: order._id.toString(),
    receipt: order.receipt,
    status: order.status,
    totalAmount: order.totalAmount,
    subtotalAmount: order.subtotalAmount,
    discountAmount: order.discountAmount ?? 0,
    couponCode: order.couponCode,
    items: order.items.map((item) => ({
      kind: itemKind(item),
      title: itemTitle(item),
      tier: itemTier(item),
      price: item.price,
      ...(item.serviceJobId
        ? { serviceJobId: item.serviceJobId.toString() }
        : {}),
    })),
  };
}
