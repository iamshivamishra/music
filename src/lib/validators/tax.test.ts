import { describe, expect, it } from "vitest";
import {
  gstinCheckDigit,
  isMaskedPan,
  isValidGstin,
  isValidPan,
  maskPan,
  taxExportQuerySchema,
  taxProfileSchema,
} from "./tax";

describe("GSTIN checksum", () => {
  it("accepts a GSTIN whose check digit matches the GSTN algorithm", () => {
    const body = "27AAPFU0939F1Z";
    const gstin = `${body}${gstinCheckDigit(body)}`;
    expect(gstin).toHaveLength(15);
    expect(isValidGstin(gstin)).toBe(true);
  });

  it("rejects a GSTIN with a wrong check digit", () => {
    const body = "27AAPFU0939F1Z";
    const valid = `${body}${gstinCheckDigit(body)}`;
    const wrong = `${body}${valid[14] === "A" ? "B" : "A"}`;
    expect(isValidGstin(wrong)).toBe(false);
  });

  it("rejects a GSTIN that fails the format regex", () => {
    expect(isValidGstin("27AAPFU0939F1")).toBe(false);
    expect(isValidGstin("")).toBe(false);
  });
});

describe("PAN", () => {
  it("accepts a valid PAN and masks all but the last 4", () => {
    expect(isValidPan("ABCDE1234F")).toBe(true);
    expect(maskPan("ABCDE1234F")).toBe("XXXXXX234F");
    expect(isMaskedPan("XXXXXX234F")).toBe(true);
  });

  it("rejects a short PAN", () => {
    expect(isValidPan("ABCDE1234")).toBe(false);
  });
});

describe("taxProfileSchema", () => {
  it("accepts empty optional fields", () => {
    const result = taxProfileSchema.parse({
      gstin: "",
      pan: "",
      legalName: "",
      stateCode: "",
    });
    expect(result.gstin).toBe("");
    expect(result.pan).toBe("");
  });

  it("accepts a masked PAN so the client can resubmit without changing it", () => {
    const result = taxProfileSchema.parse({ pan: "XXXXXX234F" });
    expect(result.pan).toBe("XXXXXX234F");
  });

  it("rejects an invalid GSTIN", () => {
    const result = taxProfileSchema.safeParse({ gstin: "NOT-A-GSTIN" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid state code", () => {
    const result = taxProfileSchema.safeParse({ stateCode: "39" });
    expect(result.success).toBe(false);
  });
});

describe("taxExportQuerySchema", () => {
  it("parses year, month, and format", () => {
    const result = taxExportQuerySchema.parse({ year: "2026", month: "9", format: "csv" });
    expect(result).toEqual({ year: 2026, month: 9, format: "csv" });
  });

  it("rejects month 13", () => {
    expect(taxExportQuerySchema.safeParse({ year: 2026, month: 13 }).success).toBe(false);
  });
});
