import { describe, expect, it } from "vitest";
import { getDefaultPlatformFeePercent, resolvePlatformFeePercent } from "./fees";

describe("resolvePlatformFeePercent", () => {
  it("returns the default fee when user is missing", () => {
    expect(resolvePlatformFeePercent(null)).toBe(getDefaultPlatformFeePercent());
    expect(resolvePlatformFeePercent(undefined)).toBe(getDefaultPlatformFeePercent());
  });

  it("uses a numeric override when expiry is null", () => {
    expect(
      resolvePlatformFeePercent({
        platformFeeOverride: 0,
        producerTierExpiresAt: null,
      })
    ).toBe(0);
  });

  it("uses a numeric override when expiry is in the future", () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(
      resolvePlatformFeePercent({
        platformFeeOverride: 5,
        producerTierExpiresAt: future,
      })
    ).toBe(5);
  });

  it("ignores override when expiry has passed", () => {
    const past = new Date(Date.now() - 86_400_000);
    expect(
      resolvePlatformFeePercent({
        platformFeeOverride: 0,
        producerTierExpiresAt: past,
      })
    ).toBe(getDefaultPlatformFeePercent());
  });

  it("returns the default when override is missing", () => {
    expect(
      resolvePlatformFeePercent({
        producerTierExpiresAt: new Date(Date.now() + 86_400_000),
      })
    ).toBe(getDefaultPlatformFeePercent());
  });
});
