export type DownloadFileType = "preview" | "master" | "stems";

export interface DownloadLinkDto {
  type: DownloadFileType;
  label: string;
  url: string;
  filename: string;
  available: boolean;
  reason?: string;
}

export interface GuestDownloadItemDto {
  beatId: string;
  beatTitle: string;
  coverUrl: string | null;
  licenseType: string;
  amount: number;
  links: DownloadLinkDto[];
}

export interface GuestDownloadDto {
  guestEmail?: string;
  guestName?: string;
  totalAmount: number;
  receipt?: string;
  paidAt?: string | Date;
  expiresAt?: string | Date;
  items: GuestDownloadItemDto[];
}

export function toGuestDownloadDto(
  order: {
    guestEmail?: string;
    guestName?: string;
    totalAmount: number;
    receipt?: string;
    paidAt?: Date;
    downloadTokenExpiry?: Date;
  },
  items: GuestDownloadItemDto[]
): GuestDownloadDto {
  return {
    guestEmail: order.guestEmail,
    guestName: order.guestName,
    totalAmount: order.totalAmount,
    receipt: order.receipt,
    paidAt: order.paidAt,
    expiresAt: order.downloadTokenExpiry,
    items,
  };
}
