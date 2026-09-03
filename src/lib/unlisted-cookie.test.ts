import { describe, expect, it } from "vitest";
import {
  UNLISTED_COOKIE_MAX_ENTRIES,
  parseUnlistedCookie,
  serializeUnlistedCookie,
  upsertUnlistedToken,
} from "./unlisted-cookie";

describe("unlisted cookie codec", () => {
  it("parses a valid map and rejects junk", () => {
    expect(parseUnlistedCookie('{"a":"tok"}')).toEqual({ a: "tok" });
    expect(parseUnlistedCookie("not-json")).toEqual({});
    expect(parseUnlistedCookie('["x"]')).toEqual({});
  });

  it("upserts a beat as the newest entry and caps the map", () => {
    let map: Record<string, string> = {};
    for (let i = 0; i < UNLISTED_COOKIE_MAX_ENTRIES + 3; i++) {
      map = upsertUnlistedToken(map, `beat_${i}`, `tok_${i}`);
    }
    expect(Object.keys(map)).toHaveLength(UNLISTED_COOKIE_MAX_ENTRIES);
    expect(map.beat_0).toBeUndefined();
    expect(map[`beat_${UNLISTED_COOKIE_MAX_ENTRIES + 2}`]).toBe(
      `tok_${UNLISTED_COOKIE_MAX_ENTRIES + 2}`
    );
    expect(JSON.parse(serializeUnlistedCookie(map))).toEqual(map);
  });

  it("moves an existing beat to the newest slot", () => {
    let map = upsertUnlistedToken({}, "a", "1");
    map = upsertUnlistedToken(map, "b", "2");
    map = upsertUnlistedToken(map, "a", "1-updated");
    expect(Object.keys(map)).toEqual(["b", "a"]);
    expect(map.a).toBe("1-updated");
  });
});
