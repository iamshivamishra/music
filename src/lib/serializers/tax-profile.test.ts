import { describe, expect, it } from "vitest";
import { mergeTaxProfile, withMaskedTaxProfile } from "./tax-profile";
import type { IUser } from "@/types";

describe("mergeTaxProfile", () => {
  it("keeps the stored PAN when the client resubmits a masked value", () => {
    const merged = mergeTaxProfile(
      { pan: "ABCDE1234F", gstin: "27AAPFU0939F1ZV" },
      { pan: "XXXXXX234F" }
    );
    expect(merged.pan).toBe("ABCDE1234F");
  });

  it("clears PAN when the client sends an empty string", () => {
    const merged = mergeTaxProfile({ pan: "ABCDE1234F" }, { pan: "" });
    expect(merged.pan).toBeUndefined();
  });
});

describe("withMaskedTaxProfile", () => {
  it("masks PAN for own-profile responses", () => {
    const user = {
      taxProfile: { pan: "ABCDE1234F" },
    } as IUser;
    expect(withMaskedTaxProfile(user).taxProfile?.pan).toBe("XXXXXX234F");
  });
});
