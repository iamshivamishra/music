import type {
  ProducerCustomerGroup,
  ProducerCustomerPurchase,
} from "@/lib/crm/types";

export type { ProducerCustomerGroup, ProducerCustomerPurchase };

export interface CustomerListItem {
  customerKey: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  orderCount: number;
  spend: number;
  lastPurchaseAt: string;
  dominantLicense: string | null;
  noteSnippet: string | null;
}

export interface CustomerPurchaseHistoryItem {
  purchaseId: string;
  title: string;
  kind: "beat" | "pack";
  licenseType: string | null;
  amount: number;
  purchasedAt: string;
}

export interface CustomerDetail extends CustomerListItem {
  note: string | null;
  purchases: CustomerPurchaseHistoryItem[];
}

const NOTE_SNIPPET_LENGTH = 80;

export function dominantLicense(types: string[]): string | null {
  const counts = new Map<string, number>();
  for (const type of types) {
    if (!type) continue;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [type, count] of counts) {
    if (count > bestCount) {
      best = type;
      bestCount = count;
    }
  }
  return best;
}

export function noteSnippet(note: string | null | undefined): string | null {
  if (!note) return null;
  const trimmed = note.trim();
  if (!trimmed) return null;
  if (trimmed.length <= NOTE_SNIPPET_LENGTH) return trimmed;
  return `${trimmed.slice(0, NOTE_SNIPPET_LENGTH).trimEnd()}…`;
}

export function toCustomerListItem(
  group: ProducerCustomerGroup,
  customerKey: string,
  note: string | null
): CustomerListItem {
  const email = group.userEmail || group.guestEmail || null;
  const deleted = Boolean(group.buyerId) && !group.name && !email;

  return {
    customerKey,
    name: group.name || (deleted ? "Deleted user" : email) || "Unknown",
    email: deleted ? null : email,
    avatarUrl: group.avatarUrl,
    orderCount: group.orderCount,
    spend: group.spend,
    lastPurchaseAt: group.lastPurchaseAt.toISOString(),
    dominantLicense: dominantLicense(group.licenseTypes),
    noteSnippet: noteSnippet(note),
  };
}

export function toCustomerPurchaseHistoryItem(
  purchase: ProducerCustomerPurchase
): CustomerPurchaseHistoryItem {
  return {
    purchaseId: purchase.purchaseId,
    title: purchase.title,
    kind: purchase.kind,
    licenseType: purchase.licenseType,
    amount: purchase.amount,
    purchasedAt: purchase.purchasedAt.toISOString(),
  };
}

export function toCustomerDetail(
  group: ProducerCustomerGroup,
  customerKey: string,
  note: string | null,
  purchases: ProducerCustomerPurchase[]
): CustomerDetail {
  return {
    ...toCustomerListItem(group, customerKey, note),
    note,
    purchases: purchases.map(toCustomerPurchaseHistoryItem),
  };
}

export function groupFromPurchases(
  identity: {
    buyerId?: string;
    guestEmail?: string;
    userEmail?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  },
  purchases: ProducerCustomerPurchase[]
): ProducerCustomerGroup {
  return {
    buyerId: identity.buyerId ?? null,
    guestEmail: identity.guestEmail ?? null,
    userEmail: identity.userEmail ?? null,
    name: identity.name ?? null,
    avatarUrl: identity.avatarUrl ?? null,
    orderCount: purchases.length,
    spend: purchases.reduce((sum, item) => sum + item.amount, 0),
    lastPurchaseAt: purchases[0]?.purchasedAt ?? new Date(0),
    licenseTypes: purchases
      .map((item) => item.licenseType)
      .filter((tier): tier is string => Boolean(tier)),
  };
}
