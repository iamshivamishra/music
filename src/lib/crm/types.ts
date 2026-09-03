export interface ProducerCustomerGroup {
  buyerId: string | null;
  guestEmail: string | null;
  userEmail: string | null;
  name: string | null;
  avatarUrl: string | null;
  orderCount: number;
  spend: number;
  lastPurchaseAt: Date;
  licenseTypes: string[];
}

export interface ProducerCustomerPurchase {
  purchaseId: string;
  title: string;
  kind: "beat" | "pack";
  licenseType: string | null;
  amount: number;
  purchasedAt: Date;
}
