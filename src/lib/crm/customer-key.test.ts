import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/errors";
import { hashEmail, parseCustomerKey, toCustomerKey } from "./customer-key";

describe("parseCustomerKey", () => {
  it("rejects a raw email in the path", () => {
    expect(() => parseCustomerKey("guest@example.com")).toThrow(ValidationError);
    expect(() => parseCustomerKey("email:guest@example.com")).toThrow(ValidationError);
  });

  it("rejects invalid hex", () => {
    expect(() => parseCustomerKey("user:not-an-id")).toThrow(ValidationError);
  });

  it("parses a user key", () => {
    expect(parseCustomerKey("user:64b1f1c2a1b2c3d4e5f60111")).toEqual({
      type: "user",
      buyerId: "64b1f1c2a1b2c3d4e5f60111",
    });
  });
});

describe("hashEmail", () => {
  it("normalizes case before hashing", () => {
    expect(hashEmail("A@B.com")).toBe(hashEmail("a@b.com"));
  });
});

describe("toCustomerKey", () => {
  it("prefers buyerId over email", () => {
    expect(toCustomerKey("64b1f1c2a1b2c3d4e5f60111", "a@b.com")).toBe(
      "user:64b1f1c2a1b2c3d4e5f60111"
    );
  });

  it("hashes email when there is no buyerId", () => {
    expect(toCustomerKey(null, "a@b.com")).toBe(`email:${hashEmail("a@b.com")}`);
  });
});
