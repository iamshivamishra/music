import { describe, expect, it } from "vitest";
import { generateUsername } from "./username";

describe("generateUsername", () => {
  it("slugifies names", () => {
    expect(generateUsername("Riya Sharma")).toBe("riya-sharma");
  });
});
