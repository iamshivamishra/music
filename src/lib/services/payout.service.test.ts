import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/payout.repository", () => ({
  payoutRepository: {
    getCompletedAndProcessingTotal: vi.fn(),
  },
}));
vi.mock("@/lib/repositories/earning.repository", () => ({
  earningRepository: { sumGrossByProducer: vi.fn() },
}));
vi.mock("@/lib/repositories/service-payment.repository", () => ({
  servicePaymentRepository: { getEligibleEarningsByProducer: vi.fn() },
}));
vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: { findById: vi.fn() },
}));
vi.mock("@/lib/razorpayx", () => ({ razorpayx: {} }));
vi.mock("@/lib/db", () => ({ withTransaction: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { payoutService } from "./payout.service";
import { earningRepository } from "@/lib/repositories/earning.repository";
import { servicePaymentRepository } from "@/lib/repositories/service-payment.repository";
import { payoutRepository } from "@/lib/repositories/payout.repository";
import { userRepository } from "@/lib/repositories/user.repository";

describe("payoutService.getBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PLATFORM_FEE_PERCENT", "10");
  });

  it("adds eligible service payments to beat earnings and ignores captured-only amounts", async () => {
    vi.mocked(earningRepository.sumGrossByProducer).mockResolvedValue(10_000);
    vi.mocked(servicePaymentRepository.getEligibleEarningsByProducer).mockResolvedValue(
      2_500
    );
    vi.mocked(payoutRepository.getCompletedAndProcessingTotal).mockResolvedValue(1_000);
    vi.mocked(userRepository.findById).mockResolvedValue(null);

    const balance = await payoutService.getBalance("producer1");

    expect(balance.grossEarnings).toBe(12_500);
    expect(balance.platformFee).toBe(1_250);
    expect(balance.withdrawable).toBe(10_250);
    expect(servicePaymentRepository.getEligibleEarningsByProducer).toHaveBeenCalledWith(
      "producer1"
    );
  });
});
