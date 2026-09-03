import { describe, expect, it } from "vitest";
import { validateFile } from "./limits";

describe("storage limits", () => {
  it("rejects invalid types and oversized files", () => {
    expect(validateFile({ size: 100, type: "text/plain" }, "preview")).toEqual({
      valid: false,
      error: expect.stringContaining("Invalid file type"),
    });
    expect(
      validateFile({ size: 21 * 1024 * 1024, type: "audio/mpeg" }, "preview")
    ).toEqual({
      valid: false,
      error: "Preview MP3 must be under 20 MB",
    });
  });

  it("accepts a service-delivery ZIP under 500 MB", () => {
    expect(
      validateFile({ size: 10 * 1024 * 1024, type: "application/zip" }, "service-delivery")
    ).toEqual({ valid: true });
    expect(
      validateFile(
        { size: 501 * 1024 * 1024, type: "application/zip" },
        "service-delivery"
      )
    ).toEqual({
      valid: false,
      error: "Service delivery ZIP must be under 500 MB",
    });
  });
});
