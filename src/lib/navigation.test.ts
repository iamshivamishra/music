import { describe, expect, it } from "vitest";
import { isNavActive } from "./navigation";

const hrefs = [
  "/studio",
  "/studio/beats",
  "/profile/library",
  "/profile",
  "/profile/beats",
  "/profile/packs",
  "/profile/transactions",
];

describe("isNavActive", () => {
  it("highlights only My Packs on /profile/packs", () => {
    expect(isNavActive("/profile/packs", "/profile/packs", hrefs)).toBe(true);
    expect(isNavActive("/profile/packs", "/profile", hrefs)).toBe(false);
    expect(isNavActive("/profile/packs", "/profile/beats", hrefs)).toBe(false);
    expect(isNavActive("/profile/packs", "/profile/library", hrefs)).toBe(false);
  });

  it("highlights only Profile on /profile", () => {
    expect(isNavActive("/profile", "/profile", hrefs)).toBe(true);
    expect(isNavActive("/profile", "/profile/packs", hrefs)).toBe(false);
  });

  it("keeps Profile active on nested pages not in the nav list", () => {
    expect(isNavActive("/profile/edit", "/profile", hrefs)).toBe(true);
    expect(isNavActive("/profile/edit", "/profile/packs", hrefs)).toBe(false);
  });

  it("highlights studio beats instead of studio overview", () => {
    expect(isNavActive("/studio/beats", "/studio/beats", hrefs)).toBe(true);
    expect(isNavActive("/studio/beats", "/studio", hrefs)).toBe(false);
    expect(isNavActive("/studio", "/studio", hrefs)).toBe(true);
  });
});
