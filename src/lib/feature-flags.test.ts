import { describe, expect, it } from "vitest";
import rawFlags from "../../config/feature-flags.json";
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  featureFlagForPath,
  getFeatureFlags,
  isFeatureEnabled,
} from "./feature-flags";

describe("feature flags", () => {
  it("enables every flag by default", () => {
    const flags = getFeatureFlags();
    for (const [key, enabled] of Object.entries(DEFAULT_FEATURE_FLAGS)) {
      expect(enabled).toBe(true);
      expect(flags[key as keyof typeof flags]).toBe(true);
      expect(isFeatureEnabled(key as keyof typeof flags)).toBe(true);
    }
  });

  it("keeps the JSON keys in lockstep with the typed flag list", () => {
    expect(Object.keys(rawFlags).sort()).toEqual([...FEATURE_FLAG_KEYS].sort());
    for (const key of FEATURE_FLAG_KEYS) {
      expect(rawFlags[key]).toBe(true);
    }
  });

  it("maps studio and API paths to the right flag", () => {
    expect(featureFlagForPath("/studio/store")).toBe("linkInBioStore");
    expect(featureFlagForPath("/studio/offers/x")).toBe("customOffers");
    expect(featureFlagForPath("/offer/token")).toBe("customOffers");
    expect(featureFlagForPath("/api/payment/offer/create-order")).toBe("customOffers");
    expect(featureFlagForPath("/studio/analytics")).toBe("sourceAnalytics");
    expect(featureFlagForPath("/api/studio/analytics/funnel")).toBe("sourceAnalytics");
    expect(featureFlagForPath("/api/studio/analytics")).toBeNull();
    expect(featureFlagForPath("/studio/customers/abc")).toBe("buyerCrm");
    expect(featureFlagForPath("/profile/jobs")).toBe("customServices");
    expect(featureFlagForPath("/studio/collabs")).toBe("collabSplits");
    expect(featureFlagForPath("/studio/leads")).toBe("freeDownloadLeads");
    expect(featureFlagForPath("/studio/tax")).toBe("producerTaxPack");
    expect(featureFlagForPath("/api/cron/publish-scheduled")).toBe("privateDrops");
    expect(featureFlagForPath("/services/abc")).toBe("customServices");
    expect(featureFlagForPath("/admin/jobs")).toBe("customServices");
    expect(featureFlagForPath("/studio/services/new")).toBe("customServices");
    expect(featureFlagForPath("/api/studio/store")).toBe("linkInBioStore");
  });

  it("gates only the beat free-download and collaborator APIs", () => {
    expect(featureFlagForPath("/api/beats/abc/free-download")).toBe(
      "freeDownloadLeads"
    );
    expect(featureFlagForPath("/api/beats/abc/collaborators")).toBe("collabSplits");
    expect(featureFlagForPath("/api/beats/abc/like")).toBeNull();
    expect(featureFlagForPath("/studio/beats")).toBeNull();
  });
});
