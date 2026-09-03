import { payoutRepository } from "@/lib/repositories/payout.repository";
import { earningRepository } from "@/lib/repositories/earning.repository";
import { servicePaymentRepository } from "@/lib/repositories/service-payment.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { razorpayx } from "@/lib/razorpayx";
import { withTransaction } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { IPayout, PaginatedResult } from "@/types";
import type { RequestPayoutInput } from "@/lib/validators/payout";

import { resolvePlatformFeePercent } from "@/lib/fees";

const AUTO_APPROVE_LIMIT = Number(process.env.PAYOUT_AUTO_APPROVE_LIMIT ?? 50_000);

export const payoutService = {
  async getBalance(producerId: string): Promise<{
    grossEarnings: number;
    totalPayouts: number;
    platformFee: number;
    withdrawable: number;
    feePercent: number;
  }> {
    const [beatGross, serviceGross, totalPayouts] = await Promise.all([
      earningRepository.sumGrossByProducer(producerId),
      servicePaymentRepository.getEligibleEarningsByProducer(producerId),
      payoutRepository.getCompletedAndProcessingTotal(producerId),
    ]);
    const grossEarnings = beatGross + serviceGross;

    const user = await userRepository.findById(producerId);
    const feePercent = resolvePlatformFeePercent(user);

    const platformFee = Math.round(grossEarnings * (feePercent / 100));
    const withdrawable = Math.max(0, grossEarnings - platformFee - totalPayouts);

    return { grossEarnings, totalPayouts, platformFee, withdrawable, feePercent };
  },

  async requestPayout(
    producerId: string,
    input: RequestPayoutInput
  ): Promise<IPayout> {
    const user = await userRepository.findById(producerId);
    if (!user) throw new NotFoundError("User");
    if (user.role !== "producer" && user.role !== "admin") {
      throw new ForbiddenError("Only producers can request payouts");
    }

    const hasInFlight = await payoutRepository.hasInFlightPayout(producerId);
    if (hasInFlight) {
      throw new ConflictError("You already have a pending or processing payout");
    }

    const balance = await this.getBalance(producerId);
    if (input.amount > balance.withdrawable) {
      throw new ValidationError("Payout amount exceeds withdrawable balance", {
        amount: [`Maximum withdrawable: ₹${balance.withdrawable}`],
      });
    }

    const platformFee = Math.round(input.amount * (balance.feePercent / 100));
    const netAmount = input.amount - platformFee;

    const payout = await withTransaction(async (session) => {
      const created = await payoutRepository.create({
        producerId: producerId as unknown as IPayout["producerId"],
        amount: input.amount,
        platformFee,
        netAmount,
        method: input.method,
        upiId: input.upiId,
        bankDetails: input.bankDetails,
        status: "requested",
      }, { session });

      // Save payout details for next time
      const payoutDetailsUpdate: Record<string, string> = {};
      if (input.upiId) payoutDetailsUpdate["payoutDetails.upiId"] = input.upiId;
      if (input.bankDetails) {
        payoutDetailsUpdate["payoutDetails.bankAccount.accountNumber"] = input.bankDetails.accountNumber;
        payoutDetailsUpdate["payoutDetails.bankAccount.ifsc"] = input.bankDetails.ifsc;
        payoutDetailsUpdate["payoutDetails.bankAccount.accountName"] = input.bankDetails.accountName;
      }
      if (Object.keys(payoutDetailsUpdate).length > 0) {
        await userRepository.update(producerId, payoutDetailsUpdate as never, { session });
      }

      return created;
    });

    audit({
      action: "payout.requested",
      userId: producerId,
      resourceType: "payout",
      resourceId: payout._id.toString(),
      metadata: { amount: input.amount, method: input.method, netAmount },
    });

    // Auto-approve if below threshold
    if (input.amount <= AUTO_APPROVE_LIMIT) {
      try {
        await this.processPayoutWithRazorpayX(payout._id.toString(), producerId);
      } catch (error) {
        logger.warn("Auto-approve RazorpayX payout failed — left as requested", {
          payoutId: payout._id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return payout;
  },

  async processPayoutWithRazorpayX(payoutId: string, producerId: string): Promise<void> {
    const payout = await payoutRepository.findById(payoutId);
    if (!payout) throw new NotFoundError("Payout");
    if (payout.status !== "requested") {
      throw new ConflictError("Payout is not in requested status");
    }

    const user = await userRepository.findById(producerId);
    if (!user) throw new NotFoundError("User");

    // Ensure RazorpayX contact exists
    let contactId = user.payoutDetails?.razorpayContactId;
    if (!contactId) {
      const contact = await razorpayx.createContact(user.name, user.email);
      contactId = contact.id;
      await userRepository.update(producerId, {
        "payoutDetails.razorpayContactId": contactId,
      } as never);
    }

    // Create fund account
    let fundAccountId: string;
    if (payout.method === "upi" && payout.upiId) {
      const fa = await razorpayx.createUpiFundAccount(contactId, payout.upiId);
      fundAccountId = fa.id;
    } else if (payout.method === "bank_transfer" && payout.bankDetails) {
      const fa = await razorpayx.createBankFundAccount(contactId, payout.bankDetails);
      fundAccountId = fa.id;
    } else {
      throw new ValidationError("Invalid payout method or missing details");
    }

    // Create payout
    const rpxPayout = await razorpayx.createPayout(
      fundAccountId,
      payout.netAmount * 100,
      "payout",
      payout._id.toString()
    );

    await payoutRepository.updateStatus(payoutId, "processing", {
      razorpayPayoutId: rpxPayout.id,
      razorpayFundAccountId: fundAccountId,
    });

    logger.info("RazorpayX payout initiated", {
      payoutId,
      razorpayPayoutId: rpxPayout.id,
      amount: payout.netAmount,
    });
  },

  async adminApprovePayout(payoutId: string, adminId: string): Promise<IPayout> {
    const payout = await payoutRepository.findById(payoutId);
    if (!payout) throw new NotFoundError("Payout");
    if (payout.status !== "requested") {
      throw new ConflictError("Payout is not in requested status");
    }

    try {
      await this.processPayoutWithRazorpayX(payoutId, payout.producerId.toString());
    } catch (error) {
      logger.error("Admin approve: RazorpayX failed", {
        payoutId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    audit({
      action: "payout.approved",
      userId: adminId,
      resourceType: "payout",
      resourceId: payoutId,
      metadata: { producerId: payout.producerId.toString(), amount: payout.amount },
    });

    const updated = await payoutRepository.findById(payoutId);
    return updated!;
  },

  async adminRejectPayout(payoutId: string, adminId: string, reason?: string): Promise<IPayout> {
    const payout = await payoutRepository.findById(payoutId);
    if (!payout) throw new NotFoundError("Payout");
    if (payout.status !== "requested") {
      throw new ConflictError("Payout is not in requested status");
    }

    const updated = await payoutRepository.updateStatus(payoutId, "failed", {
      failureReason: reason ?? "Rejected by admin",
    });

    audit({
      action: "payout.rejected",
      userId: adminId,
      resourceType: "payout",
      resourceId: payoutId,
      metadata: { producerId: payout.producerId.toString(), reason },
    });

    return updated!;
  },

  async processWebhook(event: string, payload: Record<string, unknown>): Promise<void> {
    const payoutEntity = payload.payout as { id?: string; status?: string; failure_reason?: string } | undefined;
    if (!payoutEntity?.id) return;

    const payout = await payoutRepository.findByRazorpayPayoutId(payoutEntity.id);
    if (!payout) {
      logger.warn("RazorpayX webhook: payout not found", { razorpayPayoutId: payoutEntity.id });
      return;
    }

    if (event === "payout.processed") {
      await payoutRepository.updateStatus(payout._id.toString(), "completed", {
        processedAt: new Date(),
      });
      audit({
        action: "payout.completed",
        userId: payout.producerId.toString(),
        resourceType: "payout",
        resourceId: payout._id.toString(),
      });
      logger.info("Payout completed via webhook", { payoutId: payout._id });
    } else if (event === "payout.failed" || event === "payout.reversed") {
      await payoutRepository.updateStatus(payout._id.toString(), "failed", {
        failureReason: payoutEntity.failure_reason ?? `Payout ${event.split(".")[1]}`,
      });
      audit({
        action: "payout.failed",
        userId: payout.producerId.toString(),
        resourceType: "payout",
        resourceId: payout._id.toString(),
        metadata: { event, reason: payoutEntity.failure_reason },
      });
      logger.warn("Payout failed via webhook", { payoutId: payout._id, event });
    }
  },

  async getPayoutHistory(
    producerId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<IPayout>> {
    return payoutRepository.findByProducer(producerId, page, limit);
  },

  async getPendingPayouts(
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<IPayout>> {
    return payoutRepository.findPending(page, limit);
  },

  async countPending(): Promise<number> {
    return payoutRepository.countPending();
  },
};
