import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import type { IServiceJob, IServiceListing } from "@/types";

vi.mock("@/lib/repositories/service-listing.repository", () => ({
  serviceListingRepository: { findById: vi.fn() },
}));
vi.mock("@/lib/repositories/service-job.repository", () => ({
  serviceJobRepository: {
    findById: vi.fn(),
    findExpiredAwaitingAcceptance: vi.fn().mockResolvedValue([]),
    findByProducerPaginated: vi.fn(),
    findByBuyerPaginated: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateIfStatus: vi.fn(),
  },
}));
vi.mock("@/lib/repositories/service-payment.repository", () => ({
  servicePaymentRepository: {
    create: vi.fn(),
    findByJobAndKind: vi.fn(),
    markEligibleByJobAndKind: vi.fn(),
  },
}));
vi.mock("@/lib/repositories/order.repository", () => ({
  orderRepository: {
    create: vi.fn(),
    attachRazorpayOrderId: vi.fn(),
    findById: vi.fn(),
  },
}));
vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: { findById: vi.fn() },
}));
vi.mock("@/lib/services/payment-refund.service", () => ({
  paymentRefundService: { refundOrder: vi.fn() },
}));
vi.mock("@/lib/services/storage.service", () => ({
  storageService: { getDownloadUrl: vi.fn() },
}));
vi.mock("@/lib/services/email.service", () => ({
  emailService: { sendServiceJobNotification: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/services/service-job-checkout.service", () => ({
  serviceJobCheckoutService: { createPayment: vi.fn() },
}));
vi.mock("@/lib/db", () => ({
  withTransaction: vi.fn(async (op: (session: unknown) => Promise<unknown>) => op({})),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { serviceJobService, MAX_REVISIONS } from "./service-job.service";
import { serviceListingRepository } from "@/lib/repositories/service-listing.repository";
import { serviceJobRepository } from "@/lib/repositories/service-job.repository";
import { servicePaymentRepository } from "@/lib/repositories/service-payment.repository";
import { paymentRefundService } from "@/lib/services/payment-refund.service";
import { storageService } from "@/lib/services/storage.service";
import { serviceJobCheckoutService } from "@/lib/services/service-job-checkout.service";

const listingRepo = vi.mocked(serviceListingRepository);
const jobRepo = vi.mocked(serviceJobRepository);
const paymentRepo = vi.mocked(servicePaymentRepository);
const checkout = vi.mocked(serviceJobCheckoutService);

function listing(overrides: Partial<IServiceListing> = {}): IServiceListing {
  return {
    _id: "listing1",
    producerId: "producer1",
    type: "custom_beat",
    title: "Custom trap beat",
    description: "Made to your brief.",
    startingPrice: 5000,
    depositPercent: 50,
    turnaroundDays: 7,
    extras: [{ name: "Vocals", price: 1000 }],
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function job(overrides: Partial<IServiceJob> = {}): IServiceJob {
  return {
    _id: "job1",
    listingId: "listing1",
    producerId: "producer1",
    buyerId: "buyer1",
    status: "awaiting_acceptance",
    brief: { notes: "Make it dark and heavy please." },
    extras: [],
    listingTitle: "Custom trap beat",
    listingType: "custom_beat",
    quotedTotal: 5000,
    depositAmount: 2500,
    balanceAmount: 2500,
    revisionCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("serviceJobService.createWithDeposit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobRepo.findExpiredAwaitingAcceptance.mockResolvedValue([]);
  });

  it("creates a job and Razorpay deposit order", async () => {
    listingRepo.findById.mockResolvedValue(listing());
    jobRepo.create.mockResolvedValue(job({ status: "pending_deposit" }));
    checkout.createPayment.mockResolvedValue({
      orderId: "rzp_1",
      amount: 2500,
      currency: "INR",
      internalOrderId: "order1",
      jobId: "job1",
      serviceTitle: "Custom trap beat",
    });

    const result = await serviceJobService.createWithDeposit("buyer1", {
      listingId: "listing1",
      notes: "Make it dark and heavy please.",
      extraIndexes: [],
    });

    expect(result.amount).toBe(2500);
    expect(result.orderId).toBe("rzp_1");
    expect(checkout.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending_deposit" }),
      "buyer1",
      2500,
      "service_deposit",
      "Custom trap beat"
    );
    expect(jobRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        quotedTotal: 5000,
        depositAmount: 2500,
        balanceAmount: 2500,
        status: "pending_deposit",
      })
    );
  });

  it("rejects booking your own listing", async () => {
    listingRepo.findById.mockResolvedValue(listing());
    await expect(
      serviceJobService.createWithDeposit("producer1", {
        listingId: "listing1",
        notes: "Make it dark and heavy please.",
        extraIndexes: [],
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("serviceJobService.accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobRepo.findExpiredAwaitingAcceptance.mockResolvedValue([]);
  });

  it("marks the deposit eligible after accept", async () => {
    jobRepo.findById.mockResolvedValue(job());
    jobRepo.updateIfStatus.mockResolvedValue(job({ status: "in_progress" }));

    const updated = await serviceJobService.accept("job1", "producer1");
    expect(updated.status).toBe("in_progress");
    expect(paymentRepo.markEligibleByJobAndKind).toHaveBeenCalledWith("job1", "deposit");
  });
});

describe("serviceJobService.decline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobRepo.findExpiredAwaitingAcceptance.mockResolvedValue([]);
  });

  it("refunds the deposit and cancels the job", async () => {
    jobRepo.findById.mockResolvedValue(job({ depositOrderId: "order1" }));
    jobRepo.updateIfStatus.mockResolvedValue(job({ status: "cancelled" }));
    vi.mocked(paymentRefundService.refundOrder).mockResolvedValue({} as never);

    await serviceJobService.decline("job1", "producer1");
    expect(paymentRefundService.refundOrder).toHaveBeenCalledWith("order1");
    expect(jobRepo.updateIfStatus).toHaveBeenCalledWith(
      "job1",
      ["awaiting_acceptance"],
      { status: "cancelled" }
    );
  });
});

describe("serviceJobService.requestRevision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobRepo.findExpiredAwaitingAcceptance.mockResolvedValue([]);
  });

  it("enforces the revision cap", async () => {
    jobRepo.findById.mockResolvedValue(
      job({
        status: "delivered",
        deliveryKey: "producers/producer1/jobs/job1/delivery.zip",
        revisionCount: MAX_REVISIONS,
        balanceAmount: 0,
      })
    );
    paymentRepo.findByJobAndKind.mockResolvedValue(null);

    await expect(serviceJobService.requestRevision("job1", "buyer1")).rejects.toBeInstanceOf(
      ValidationError
    );
  });
});

describe("serviceJobService.getDownloadUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobRepo.findExpiredAwaitingAcceptance.mockResolvedValue([]);
  });

  it("blocks the buyer until the balance is paid", async () => {
    jobRepo.findById.mockResolvedValue(
      job({
        status: "delivered",
        deliveryKey: "producers/producer1/jobs/job1/delivery.zip",
        balanceAmount: 2500,
      })
    );
    paymentRepo.findByJobAndKind.mockResolvedValue(null);

    await expect(serviceJobService.getDownloadUrl("job1", "buyer1")).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });

  it("returns a signed URL after the balance is paid", async () => {
    jobRepo.findById.mockResolvedValue(
      job({
        status: "delivered",
        deliveryKey: "producers/producer1/jobs/job1/delivery.zip",
        balanceAmount: 2500,
      })
    );
    paymentRepo.findByJobAndKind.mockResolvedValue({ status: "captured" } as never);
    vi.mocked(storageService.getDownloadUrl).mockResolvedValue("https://signed.example/file.zip");

    await expect(serviceJobService.getDownloadUrl("job1", "buyer1")).resolves.toBe(
      "https://signed.example/file.zip"
    );
  });
});

describe("serviceJobService.onPaymentCaptured", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("moves a pending deposit job to awaiting_acceptance", async () => {
    jobRepo.findById.mockResolvedValue(job({ status: "pending_deposit" }));
    paymentRepo.create.mockResolvedValue({} as never);
    jobRepo.updateIfStatus.mockResolvedValue(job({ status: "awaiting_acceptance" }));

    await serviceJobService.onPaymentCaptured({
      _id: "order1",
      items: [
        {
          kind: "service_deposit",
          serviceJobId: "job1",
          serviceTitle: "Custom trap beat",
          price: 2500,
        },
      ],
    } as never);

    expect(paymentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "deposit", status: "captured", amount: 2500 }),
      expect.anything()
    );
    expect(jobRepo.updateIfStatus).toHaveBeenCalledWith(
      "job1",
      ["pending_deposit"],
      expect.objectContaining({ status: "awaiting_acceptance" }),
      expect.anything()
    );
  });
});

describe("serviceJobService.expireStaleJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refunds the deposit and cancels timed-out jobs", async () => {
    jobRepo.findExpiredAwaitingAcceptance.mockResolvedValue([
      job({ depositOrderId: "order1" }),
    ]);
    vi.mocked(paymentRefundService.refundOrder).mockResolvedValue({} as never);
    jobRepo.updateIfStatus.mockResolvedValue(job({ status: "cancelled" }));

    const expired = await serviceJobService.expireStaleJobs();

    expect(expired).toBe(1);
    expect(paymentRefundService.refundOrder).toHaveBeenCalledWith("order1");
    expect(jobRepo.updateIfStatus).toHaveBeenCalledWith(
      "job1",
      ["awaiting_acceptance"],
      { status: "cancelled" }
    );
  });
});
