import { describe, expect, it } from "vitest";
import { csvEscape, toCsv } from "./csv";

describe("csvEscape", () => {
  it("leaves plain values unchanged", () => {
    expect(csvEscape("Midnight")).toBe("Midnight");
    expect(csvEscape(499)).toBe("499");
  });

  it("quotes values that contain commas, quotes, or newlines", () => {
    expect(csvEscape("Lo-fi, chill")).toBe('"Lo-fi, chill"');
    expect(csvEscape('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("toCsv", () => {
  it("emits a header row and escaped data rows", () => {
    const csv = toCsv(
      ["title", "amount"],
      [
        ["Lo-fi, chill", 199],
        ['Track "One"', 299],
      ]
    );
    expect(csv).toBe('title,amount\r\n"Lo-fi, chill",199\r\n"Track ""One""",299\r\n');
  });
});
