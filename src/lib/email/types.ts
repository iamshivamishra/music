export interface PurchaseEmailDownload {
  label: string;
  url: string;
}

export interface PurchaseEmailItem {
  beatTitle: string;
  producerName: string;
  licenseType: string;
  licenseName: string;
  price: number;
  downloads: PurchaseEmailDownload[];
  licensePdfUrl?: string;
  packBeatCount?: number;
}

export interface PurchaseEmailParams {
  to: string;
  buyerName: string;
  items: PurchaseEmailItem[];
  totalAmount: number;
  orderId: string;
  paymentId: string;
  purchaseDate: Date;
  accessUrl: string;
  accessCtaLabel: string;
}

export interface SaleNotificationItem {
  beatTitle: string;
  licenseName: string;
  licenseType: string;
  amount: number;
}

export interface SaleNotificationParams {
  to: string;
  producerName: string;
  buyerName: string;
  items: SaleNotificationItem[];
  totalAmount: number;
  purchaseDate: Date;
}

export function formatPurchaseConfirmationSubject(receipt: string): string {
  return `Your beats are ready! — Order #${receipt}`;
}
