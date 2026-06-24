import { describe, expect, it } from "vitest";
import { toValidObjectIdOrNull } from "./object-id";

describe("toValidObjectIdOrNull", () => {
  it("returns null for invalid object id strings", () => {
    expect(toValidObjectIdOrNull("invalid-id")).toBeNull();
  });

  it("returns an ObjectId for valid values", () => {
    const id = "507f1f77bcf86cd799439011";
    const parsed = toValidObjectIdOrNull(id);

    expect(parsed).not.toBeNull();
    expect(parsed?.toString()).toBe(id);
  });
});
