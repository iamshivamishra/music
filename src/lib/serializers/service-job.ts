import type { IServiceJob } from "@/types";

export interface ServiceJobDto {
  id: string;
  listingId: string;
  producerId: string;
  buyerId: string;
  status: IServiceJob["status"];
  listingTitle: string;
  listingType: IServiceJob["listingType"];
  brief: IServiceJob["brief"];
  extras: IServiceJob["extras"];
  quotedTotal: number;
  depositAmount: number;
  balanceAmount: number;
  revisionCount: number;
  acceptBy?: string;
  hasDelivery: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceJobDetailDto extends ServiceJobDto {
  unlocked: boolean;
  balancePaid: boolean;
}

export function toServiceJobDto(job: IServiceJob): ServiceJobDto {
  return {
    id: job._id.toString(),
    listingId: job.listingId.toString(),
    producerId: job.producerId.toString(),
    buyerId: job.buyerId.toString(),
    status: job.status,
    listingTitle: job.listingTitle,
    listingType: job.listingType,
    brief: job.brief,
    extras: job.extras ?? [],
    quotedTotal: job.quotedTotal,
    depositAmount: job.depositAmount,
    balanceAmount: job.balanceAmount,
    revisionCount: job.revisionCount,
    acceptBy: job.acceptBy ? new Date(job.acceptBy).toISOString() : undefined,
    hasDelivery: Boolean(job.deliveryKey),
    createdAt: new Date(job.createdAt).toISOString(),
    updatedAt: new Date(job.updatedAt).toISOString(),
  };
}

export function toServiceJobDetailDto(
  job: IServiceJob,
  flags: { unlocked: boolean; balancePaid: boolean }
): ServiceJobDetailDto {
  return {
    ...toServiceJobDto(job),
    unlocked: flags.unlocked,
    balancePaid: flags.balancePaid,
  };
}
