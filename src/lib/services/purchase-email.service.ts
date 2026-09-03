import { beatRepository } from "@/lib/repositories/beat.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { earningRepository } from "@/lib/repositories/earning.repository";
import { emailService } from "@/lib/services/email.service";
import { storageService } from "@/lib/services/storage.service";
import { getAppUrl } from "@/lib/app-url";
import type {
  PurchaseEmailDownload,
  PurchaseEmailItem,
  SaleNotificationItem,
} from "@/lib/email/types";
import { licenseDisplayName, packDisplayName } from "@/lib/validators/license";
import { logger } from "@/lib/logger";
import type { IBeat, IOrder, IOrderItem, IPurchase, IUser } from "@/types";

export const EMAIL_DOWNLOAD_TTL_SECONDS = 86400;

export interface NotifyOrderFulfilledParams {
  order: IOrder;
  purchases: IPurchase[];
  buyerEmail: string;
  buyerName: string;
  guestDownloadToken?: string;
}

interface ProducerGroup {
  producerEmail: string;
  producerName: string;
  items: SaleNotificationItem[];
  totalAmount: number;
}

interface EmailPayload {
  buyerItems: PurchaseEmailItem[];
  producerGroups: Map<string, ProducerGroup>;
}

function resolveAccess(guestDownloadToken?: string): {
  accessUrl: string;
  accessCtaLabel: string;
  includeLicensePdfLinks: boolean;
} {
  const appUrl = getAppUrl();
  if (guestDownloadToken) {
    return {
      accessUrl: `${appUrl}/download/${guestDownloadToken}`,
      accessCtaLabel: "Download Your Beats",
      includeLicensePdfLinks: false,
    };
  }
  return {
    accessUrl: `${appUrl}/profile/library`,
    accessCtaLabel: "Access Your Library",
    includeLicensePdfLinks: true,
  };
}

function producerLabel(producer: IUser | undefined): string {
  return producer?.displayName || producer?.name || "Producer";
}

function findPurchaseForItem(
  item: IOrderItem,
  purchases: IPurchase[]
): IPurchase | undefined {
  if (item.packId) {
    const packId = item.packId.toString();
    return purchases.find((p) => p.packId?.toString() === packId);
  }
  if (item.beatId) {
    const beatId = item.beatId.toString();
    return purchases.find((p) => p.beatId?.toString() === beatId);
  }
  return undefined;
}

async function signUrl(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  try {
    const url = await storageService.getDownloadUrlForValue(value, {
      expiresInSeconds: EMAIL_DOWNLOAD_TTL_SECONDS,
    });
    return url || null;
  } catch {
    return null;
  }
}

async function signEntitledDownloads(
  beat: IBeat | undefined,
  purchase: IPurchase | undefined
): Promise<PurchaseEmailDownload[]> {
  if (!beat || !purchase) return [];

  const downloads: PurchaseEmailDownload[] = [];
  if (purchase.includesWav) {
    const url = await signUrl(beat.storageKeys?.master || beat.audioFullUrl);
    if (url) downloads.push({ label: "Download WAV", url });
  }
  if (purchase.includesStems) {
    const url = await signUrl(beat.storageKeys?.stems || beat.stemsUrl);
    if (url) downloads.push({ label: "Download Stems", url });
  }
  return downloads;
}

function licensePdfUrl(
  purchase: IPurchase | undefined,
  include: boolean
): string | undefined {
  if (!include || !purchase) return undefined;
  return `${getAppUrl()}/api/purchases/${purchase._id.toString()}/license-pdf`;
}

function upsertProducerGroup(
  groups: Map<string, ProducerGroup>,
  producerId: string,
  producerEmail: string,
  producerName: string,
  item: SaleNotificationItem
): void {
  const group = groups.get(producerId) ?? {
    producerEmail,
    producerName,
    items: [],
    totalAmount: 0,
  };
  group.items.push(item);
  group.totalAmount += item.amount;
  groups.set(producerId, group);
}

async function buildEmailPayload(
  order: IOrder,
  purchases: IPurchase[],
  includeLicensePdfLinks: boolean
): Promise<EmailPayload> {
  const beatIds = order.items.filter((item) => item.beatId).map((item) => item.beatId!.toString());
  const packIds = order.items.filter((item) => item.packId).map((item) => item.packId!.toString());

  const [beats, packs] = await Promise.all([
    beatIds.length > 0 ? beatRepository.findByIds(beatIds, true) : Promise.resolve([]),
    packIds.length > 0 ? packRepository.findByIds(packIds) : Promise.resolve([]),
  ]);

  const beatMap = new Map(beats.map((b) => [b._id.toString(), b]));
  const packMap = new Map(packs.map((p) => [p._id.toString(), p]));

  const earnings = await earningRepository.findByPurchaseIds(
    purchases.map((purchase) => purchase._id.toString())
  );
  const earningsByPurchase = new Map<string, typeof earnings>();
  for (const earning of earnings) {
    const key = earning.purchaseId.toString();
    const list = earningsByPurchase.get(key) ?? [];
    list.push(earning);
    earningsByPurchase.set(key, list);
  }

  const producerIds = [
    ...new Set([
      ...beats.map((b) => b.producerId.toString()),
      ...packs.map((p) => p.producerId.toString()),
      ...earnings.map((earning) => earning.producerId.toString()),
    ]),
  ];
  const producers =
    producerIds.length > 0 ? await userRepository.findByIds(producerIds) : [];
  const producerMap = new Map(producers.map((p) => [p._id.toString(), p]));

  const producerGroups = new Map<string, ProducerGroup>();

  function creditSaleRecipients(
    purchase: IPurchase | undefined,
    fallbackProducerId: string,
    item: SaleNotificationItem
  ) {
    const rows = purchase
      ? earningsByPurchase.get(purchase._id.toString())
      : undefined;
    if (!rows || rows.length === 0) {
      const producer = producerMap.get(fallbackProducerId);
      upsertProducerGroup(
        producerGroups,
        fallbackProducerId,
        producer?.email ?? "",
        producerLabel(producer),
        item
      );
      return;
    }
    for (const row of rows) {
      const producerId = row.producerId.toString();
      const producer = producerMap.get(producerId);
      upsertProducerGroup(
        producerGroups,
        producerId,
        producer?.email ?? "",
        producerLabel(producer),
        { ...item, amount: row.grossAmount }
      );
    }
  }

  const buyerItems = await Promise.all(
    order.items.map(async (item): Promise<PurchaseEmailItem | null> => {
      const purchase = findPurchaseForItem(item, purchases);

      if (item.packId) {
        const pack = packMap.get(item.packId.toString());
        const producer = pack ? producerMap.get(pack.producerId.toString()) : undefined;
        const producerId = pack?.producerId.toString() ?? "unknown";
        const producerName = producerLabel(producer);
        const licenseName = packDisplayName(item.packTier);
        const licenseType = item.packTier || "basic";
        const beatTitle = item.packTitle || pack?.title || "Beat Pack";

        creditSaleRecipients(purchase, producerId, {
          beatTitle,
          licenseName,
          licenseType,
          amount: item.price,
        });

        return {
          beatTitle,
          producerName,
          licenseType,
          licenseName,
          price: item.price,
          downloads: [],
          licensePdfUrl: licensePdfUrl(purchase, includeLicensePdfLinks),
          packBeatCount: pack?.beats.length,
        };
      }

      if (!item.beatId) return null;

      const beat = beatMap.get(item.beatId.toString());
      const producerId = beat?.producerId.toString() ?? "unknown";
      const producer = producerId !== "unknown" ? producerMap.get(producerId) : undefined;
      const producerName = producerLabel(producer);
      const licenseType = item.licenseType || "basic";
      const licenseName = purchase?.offerId
        ? `Custom offer — ${licenseDisplayName(item.licenseType)}`
        : licenseDisplayName(item.licenseType);
      const beatTitle = item.beatTitle || beat?.title || "Beat";

      creditSaleRecipients(purchase, producerId, {
        beatTitle,
        licenseName,
        licenseType,
        amount: item.price,
      });

      return {
        beatTitle,
        producerName,
        licenseType,
        licenseName,
        price: item.price,
        downloads: await signEntitledDownloads(beat, purchase),
        licensePdfUrl: licensePdfUrl(purchase, includeLicensePdfLinks),
      };
    })
  );

  return {
    buyerItems: buyerItems.filter((item): item is PurchaseEmailItem => item !== null),
    producerGroups,
  };
}

export const purchaseEmailService = {
  async notifyOrderFulfilled({
    order,
    purchases,
    buyerEmail,
    buyerName,
    guestDownloadToken,
  }: NotifyOrderFulfilledParams): Promise<void> {
    const access = resolveAccess(guestDownloadToken);

    let payload: EmailPayload;
    try {
      payload = await buildEmailPayload(order, purchases, access.includeLicensePdfLinks);
    } catch (error) {
      logger.warn("Failed to build post-payment email data", {
        orderId: order._id,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    const paymentId = order.razorpayPaymentId ?? "";
    const purchaseDate = order.paidAt ?? new Date();
    const receipt = order.receipt || order._id.toString();

    await Promise.allSettled([
      emailService.sendPurchaseConfirmation({
        to: buyerEmail,
        buyerName,
        items: payload.buyerItems,
        totalAmount: order.totalAmount,
        orderId: receipt,
        paymentId,
        purchaseDate,
        accessUrl: access.accessUrl,
        accessCtaLabel: access.accessCtaLabel,
      }),
      ...[...payload.producerGroups.values()]
        .filter((group) => group.producerEmail)
        .map((group) =>
          emailService.sendSaleNotification({
            to: group.producerEmail,
            producerName: group.producerName,
            buyerName,
            items: group.items,
            totalAmount: group.totalAmount,
            purchaseDate,
          })
        ),
    ]);
  },
};
