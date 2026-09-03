import { serviceListingRepository } from "@/lib/repositories/service-listing.repository";
import { serviceJobRepository } from "@/lib/repositories/service-job.repository";
import { servicePaymentRepository } from "@/lib/repositories/service-payment.repository";
import { orderRepository } from "@/lib/repositories/order.repository";
import { paymentRefundService } from "@/lib/services/payment-refund.service";
import { serviceJobCheckoutService } from "@/lib/services/service-job-checkout.service";
import { serviceJobEmailService } from "@/lib/services/service-job-email.service";
import { storageService } from "@/lib/services/storage.service";
import { withTransaction } from "@/lib/db";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { isOwnedServiceDeliveryKey } from "@/lib/storage/keys";
import { toServiceJobDetailDto, type ServiceJobDetailDto } from "@/lib/serializers/service-job";
import { ACCEPT_WINDOW_MS, MAX_REVISIONS } from "@/lib/validators/service-job";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { CreateServiceJobInput } from "@/lib/validators/service-job";
import type {
  IOrder,
  IServiceExtra,
  IServiceJob,
  IServiceListing,
  PaginatedResult,
  ServiceJobStatus,
  ServicePaymentKind,
} from "@/types";
import type { ClientSession } from "mongoose";

export { MAX_REVISIONS, ACCEPT_WINDOW_MS, OPEN_SERVICE_JOB_STATUSES } from "@/lib/validators/service-job";
export type { ServiceCheckoutResult } from "@/lib/services/service-job-checkout.service";

function quoteFromListing(listing: IServiceListing, extraIndexes: number[]): {
  extras: IServiceExtra[];
  quotedTotal: number;
  depositAmount: number;
  balanceAmount: number;
} {
  const extras = extraIndexes
    .map((index) => listing.extras[index])
    .filter((extra): extra is IServiceExtra => Boolean(extra));
  const extrasTotal = extras.reduce((sum, extra) => sum + extra.price, 0);
  const quotedTotal = listing.startingPrice + extrasTotal;
  const depositAmount = Math.min(
    quotedTotal,
    Math.max(1, Math.round((quotedTotal * listing.depositPercent) / 100))
  );
  return {
    extras,
    quotedTotal,
    depositAmount,
    balanceAmount: quotedTotal - depositAmount,
  };
}

function isUnlocked(job: IServiceJob, balancePaid: boolean): boolean {
  if (!job.deliveryKey) return false;
  return job.balanceAmount === 0 || balancePaid;
}

function assertJobActor(
  job: IServiceJob,
  userId: string,
  role: "buyer" | "producer" | "either"
): void {
  const isBuyer = job.buyerId.toString() === userId;
  const isProducer = job.producerId.toString() === userId;
  if (role === "buyer" && !isBuyer) throw new ForbiddenError();
  if (role === "producer" && !isProducer) throw new ForbiddenError();
  if (role === "either" && !isBuyer && !isProducer) throw new ForbiddenError();
}

export const serviceJobService = {
  async listForProducer(
    producerId: string,
    status?: ServiceJobStatus,
    page?: number,
    limit?: number
  ): Promise<PaginatedResult<IServiceJob>> {
    return serviceJobRepository.findByProducerPaginated(producerId, status, page, limit);
  },

  async listForBuyer(
    buyerId: string,
    status?: ServiceJobStatus,
    page?: number,
    limit?: number
  ): Promise<PaginatedResult<IServiceJob>> {
    return serviceJobRepository.findByBuyerPaginated(buyerId, status, page, limit);
  },

  async listDisputed(page?: number, limit?: number): Promise<PaginatedResult<IServiceJob>> {
    return serviceJobRepository.findDisputedPaginated(page, limit);
  },

  async getForUser(jobId: string, userId: string, isAdmin = false): Promise<IServiceJob> {
    const job = await serviceJobRepository.findById(jobId);
    if (!job) throw new NotFoundError("Job");
    if (!isAdmin) assertJobActor(job, userId, "either");
    return job;
  },

  async getDetailForUser(
    jobId: string,
    userId: string,
    isAdmin = false
  ): Promise<ServiceJobDetailDto> {
    const job = await this.getForUser(jobId, userId, isAdmin);
    const [unlocked, balancePaid] = await Promise.all([
      this.isDownloadUnlocked(job),
      this.isBalancePaid(job),
    ]);
    return toServiceJobDetailDto(job, { unlocked, balancePaid });
  },

  async createWithDeposit(buyerId: string, input: CreateServiceJobInput) {
    const listing = await serviceListingRepository.findById(input.listingId);
    if (!listing || listing.status !== "published") {
      throw new NotFoundError("Service");
    }
    if (listing.producerId.toString() === buyerId) {
      throw new ForbiddenError("You cannot book your own service");
    }

    const quote = quoteFromListing(listing, input.extraIndexes ?? []);
    const referencesUrl = input.referencesUrl?.trim() || undefined;

    const job = await serviceJobRepository.create({
      listingId: listing._id as unknown as IServiceJob["listingId"],
      producerId: listing.producerId as unknown as IServiceJob["producerId"],
      buyerId: buyerId as unknown as IServiceJob["buyerId"],
      status: "pending_deposit",
      brief: {
        notes: input.notes,
        referencesUrl,
        bpm: input.bpm,
        genre: input.genre,
        duePreference: input.duePreference,
      },
      extras: quote.extras,
      listingTitle: listing.title,
      listingType: listing.type,
      quotedTotal: quote.quotedTotal,
      depositAmount: quote.depositAmount,
      balanceAmount: quote.balanceAmount,
      revisionCount: 0,
    });

    audit({
      action: "service.job_created",
      userId: buyerId,
      resourceType: "service_job",
      resourceId: job._id.toString(),
    });

    return serviceJobCheckoutService.createPayment(
      job,
      buyerId,
      quote.depositAmount,
      "service_deposit",
      listing.title
    );
  },

  async createBalanceCheckout(jobId: string, buyerId: string) {
    const job = await this.getForUser(jobId, buyerId);
    assertJobActor(job, buyerId, "buyer");
    if (job.balanceAmount <= 0) {
      throw new ValidationError("No remaining balance", {
        amount: ["This job is already paid in full"],
      });
    }
    if (!["in_progress", "delivered", "revision_requested"].includes(job.status)) {
      throw new ConflictError("Balance cannot be paid in the current job status");
    }
    if (job.balanceOrderId) {
      const existing = await orderRepository.findById(job.balanceOrderId.toString());
      if (existing?.status === "paid") {
        throw new ConflictError("Balance is already paid");
      }
      if (existing?.status === "pending" && existing.razorpayOrderId) {
        return {
          orderId: existing.razorpayOrderId,
          amount: existing.totalAmount,
          currency: "INR",
          internalOrderId: existing._id.toString(),
          jobId: job._id.toString(),
          serviceTitle: job.listingTitle,
        };
      }
    }
    return serviceJobCheckoutService.createPayment(
      job,
      buyerId,
      job.balanceAmount,
      "service_balance",
      job.listingTitle
    );
  },

  async onPaymentCaptured(order: IOrder, session?: ClientSession): Promise<void> {
    const item = order.items.find(
      (entry) => entry.kind === "service_deposit" || entry.kind === "service_balance"
    );
    if (!item?.serviceJobId) {
      throw new ConflictError("Service order is missing a job id");
    }

    const job = await serviceJobRepository.findById(item.serviceJobId.toString(), { session });
    if (!job) throw new NotFoundError("Job");

    const kind: ServicePaymentKind =
      item.kind === "service_balance" ? "balance" : "deposit";

    try {
      await servicePaymentRepository.create(
        {
          jobId: job._id as unknown as IServiceJob["listingId"],
          producerId: job.producerId,
          buyerId: job.buyerId,
          orderId: order._id as unknown as IServiceJob["depositOrderId"],
          kind,
          amount: item.price,
          status: "captured",
        },
        { session }
      );
    } catch (error) {
      const mongoError = error as { code?: number };
      if (mongoError.code !== 11000) throw error;
    }

    if (kind === "deposit" && job.status === "pending_deposit") {
      const acceptBy = new Date(Date.now() + ACCEPT_WINDOW_MS);
      await serviceJobRepository.updateIfStatus(
        job._id.toString(),
        ["pending_deposit"],
        {
          status: "awaiting_acceptance",
          acceptBy,
          depositOrderId: order._id as unknown as IServiceJob["depositOrderId"],
        },
        { session }
      );
      serviceJobEmailService.notify("new", {
        ...job,
        status: "awaiting_acceptance",
        acceptBy,
      });
    }

    if (kind === "balance") {
      await serviceJobRepository.update(
        job._id.toString(),
        { balanceOrderId: order._id as unknown as IServiceJob["balanceOrderId"] },
        { session }
      );
    }
  },

  async accept(jobId: string, producerId: string): Promise<IServiceJob> {
    await this.expireStaleJobs();
    const job = await this.getForUser(jobId, producerId);
    assertJobActor(job, producerId, "producer");
    if (job.status === "in_progress") return job;
    if (job.status !== "awaiting_acceptance") {
      throw new ConflictError("This job cannot be accepted");
    }

    const updated = await serviceJobRepository.updateIfStatus(
      jobId,
      ["awaiting_acceptance"],
      { status: "in_progress" }
    );
    if (!updated) throw new ConflictError("This job cannot be accepted");

    await servicePaymentRepository.markEligibleByJobAndKind(jobId, "deposit");
    audit({
      action: "service.job_accepted",
      userId: producerId,
      resourceType: "service_job",
      resourceId: jobId,
    });
    serviceJobEmailService.notify("accepted", updated);
    return updated;
  },

  async decline(jobId: string, producerId: string): Promise<IServiceJob> {
    const job = await this.getForUser(jobId, producerId);
    assertJobActor(job, producerId, "producer");
    if (job.status === "cancelled") return job;
    if (job.status !== "awaiting_acceptance") {
      throw new ConflictError("This job cannot be declined");
    }
    if (!job.depositOrderId) throw new ConflictError("No deposit to refund");

    await paymentRefundService.refundOrder(job.depositOrderId.toString());
    const updated = await serviceJobRepository.updateIfStatus(
      jobId,
      ["awaiting_acceptance"],
      { status: "cancelled" }
    );
    if (!updated) throw new ConflictError("This job cannot be declined");

    audit({
      action: "service.job_declined",
      userId: producerId,
      resourceType: "service_job",
      resourceId: jobId,
    });
    serviceJobEmailService.notify("declined", updated);
    return updated;
  },

  async expireStaleJobs(): Promise<number> {
    if (!isFeatureEnabled("customServices")) return 0;
    const stale = await serviceJobRepository.findExpiredAwaitingAcceptance();
    let expired = 0;
    for (const job of stale) {
      try {
        if (job.depositOrderId) {
          await paymentRefundService.refundOrder(job.depositOrderId.toString());
        }
        const updated = await serviceJobRepository.updateIfStatus(
          job._id.toString(),
          ["awaiting_acceptance"],
          { status: "cancelled" }
        );
        if (updated) {
          expired += 1;
          audit({
            action: "service.job_cancelled",
            resourceType: "service_job",
            resourceId: job._id.toString(),
            metadata: { reason: "accept_timeout" },
          });
          serviceJobEmailService.notify("declined", updated);
        }
      } catch (error) {
        logger.warn("Failed to expire service job", {
          jobId: job._id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return expired;
  },

  async initiateDeliveryUpload(
    jobId: string,
    producerId: string,
    contentType: string,
    fileSize: number
  ) {
    const job = await this.getForUser(jobId, producerId);
    assertJobActor(job, producerId, "producer");
    if (!["in_progress", "revision_requested"].includes(job.status)) {
      throw new ConflictError("Files can only be uploaded while the job is in progress");
    }
    return storageService.initiateServiceDeliveryUpload(
      producerId,
      jobId,
      contentType,
      fileSize
    );
  },

  async setDelivery(jobId: string, producerId: string, deliveryKey: string): Promise<IServiceJob> {
    const job = await this.getForUser(jobId, producerId);
    assertJobActor(job, producerId, "producer");
    if (!["in_progress", "revision_requested"].includes(job.status)) {
      throw new ConflictError("Files can only be uploaded while the job is in progress");
    }
    if (!isOwnedServiceDeliveryKey(deliveryKey, producerId, jobId)) {
      throw new ValidationError("Invalid delivery file", {
        deliveryKey: ["Upload a ZIP for this job"],
      });
    }

    const updated = await serviceJobRepository.updateIfStatus(
      jobId,
      ["in_progress", "revision_requested"],
      { status: "delivered", deliveryKey }
    );
    if (!updated) throw new ConflictError("Could not save delivery");
    audit({
      action: "service.job_delivered",
      userId: producerId,
      resourceType: "service_job",
      resourceId: jobId,
    });
    serviceJobEmailService.notify("delivered", updated);
    return updated;
  },

  async requestRevision(jobId: string, buyerId: string): Promise<IServiceJob> {
    const job = await this.getForUser(jobId, buyerId);
    assertJobActor(job, buyerId, "buyer");
    if (job.status !== "delivered") {
      throw new ConflictError("Revisions can only be requested after delivery");
    }
    if (job.revisionCount >= MAX_REVISIONS) {
      throw new ValidationError("Revision limit reached", {
        revisionCount: [`A maximum of ${MAX_REVISIONS} revisions is allowed`],
      });
    }
    const balancePaid = await this.isBalancePaid(job);
    if (!isUnlocked(job, balancePaid)) {
      throw new ForbiddenError("Pay the remaining balance before requesting a revision");
    }

    const updated = await serviceJobRepository.updateIfStatus(
      jobId,
      ["delivered"],
      { status: "revision_requested", revisionCount: job.revisionCount + 1 }
    );
    if (!updated) throw new ConflictError("Could not request revision");
    audit({
      action: "service.revision_requested",
      userId: buyerId,
      resourceType: "service_job",
      resourceId: jobId,
    });
    return updated;
  },

  async complete(jobId: string, buyerId: string): Promise<IServiceJob> {
    const job = await this.getForUser(jobId, buyerId);
    assertJobActor(job, buyerId, "buyer");
    if (job.status !== "delivered") {
      throw new ConflictError("Only delivered jobs can be completed");
    }
    const balancePaid = await this.isBalancePaid(job);
    if (!isUnlocked(job, balancePaid)) {
      throw new ForbiddenError("Pay the remaining balance before completing");
    }
    return this.markCompleted(jobId, buyerId);
  },

  async dispute(jobId: string, userId: string): Promise<IServiceJob> {
    const job = await this.getForUser(jobId, userId);
    assertJobActor(job, userId, "either");
    if (["completed", "cancelled", "pending_deposit"].includes(job.status)) {
      throw new ConflictError("This job cannot be disputed");
    }
    const updated = await serviceJobRepository.updateIfStatus(
      jobId,
      ["awaiting_acceptance", "in_progress", "delivered", "revision_requested"],
      { status: "disputed" }
    );
    if (!updated) throw new ConflictError("Could not open a dispute");
    audit({
      action: "service.job_disputed",
      userId,
      resourceType: "service_job",
      resourceId: jobId,
    });
    serviceJobEmailService.notifyDispute(job, jobId);
    return updated;
  },

  async adminComplete(jobId: string, adminId: string): Promise<IServiceJob> {
    const job = await serviceJobRepository.findById(jobId);
    if (!job) throw new NotFoundError("Job");
    return this.markCompleted(jobId, adminId);
  },

  async adminRefund(jobId: string, adminId: string): Promise<IServiceJob> {
    const job = await serviceJobRepository.findById(jobId);
    if (!job) throw new NotFoundError("Job");
    if (job.depositOrderId) {
      try {
        await paymentRefundService.refundOrder(job.depositOrderId.toString());
      } catch (error) {
        logger.warn("Admin deposit refund skipped", {
          jobId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    if (job.balanceOrderId) {
      try {
        await paymentRefundService.refundOrder(job.balanceOrderId.toString());
      } catch (error) {
        logger.warn("Admin balance refund skipped", {
          jobId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const updated = await serviceJobRepository.update(jobId, { status: "cancelled" });
    if (!updated) throw new NotFoundError("Job");
    audit({
      action: "service.job_cancelled",
      userId: adminId,
      resourceType: "service_job",
      resourceId: jobId,
      metadata: { reason: "admin_refund" },
    });
    return updated;
  },

  async getDownloadUrl(jobId: string, userId: string, isAdmin = false): Promise<string> {
    const job = await this.getForUser(jobId, userId, isAdmin);
    const isProducer = job.producerId.toString() === userId;
    const balancePaid = await this.isBalancePaid(job);
    if (!isProducer && !isAdmin && !isUnlocked(job, balancePaid)) {
      throw new ForbiddenError("Delivery is locked until the balance is paid");
    }
    if (!job.deliveryKey) throw new NotFoundError("Delivery file");
    return storageService.getDownloadUrl(job.deliveryKey);
  },

  async isBalancePaid(job: IServiceJob): Promise<boolean> {
    if (job.balanceAmount === 0) return true;
    const payment = await servicePaymentRepository.findByJobAndKind(
      job._id.toString(),
      "balance"
    );
    return payment?.status === "captured" || payment?.status === "eligible";
  },

  async isDownloadUnlocked(job: IServiceJob): Promise<boolean> {
    return isUnlocked(job, await this.isBalancePaid(job));
  },

  async markCompleted(jobId: string, actorId: string): Promise<IServiceJob> {
    const updated = await withTransaction(async (session) => {
      const job = await serviceJobRepository.updateIfStatus(
        jobId,
        ["delivered", "disputed", "in_progress", "revision_requested"],
        { status: "completed" },
        { session }
      );
      if (!job) throw new ConflictError("This job cannot be completed");
      await servicePaymentRepository.markEligibleByJobAndKind(jobId, "deposit", { session });
      await servicePaymentRepository.markEligibleByJobAndKind(jobId, "balance", { session });
      return job;
    });
    audit({
      action: "service.job_completed",
      userId: actorId,
      resourceType: "service_job",
      resourceId: jobId,
    });
    return updated;
  },
};
