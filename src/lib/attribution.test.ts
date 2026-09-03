import { describe, expect, it } from "vitest";
import {
  SRC_COOKIE,
  SRC_OVERWRITE_WINDOW_MS,
  SRC_TS_COOKIE,
  appendSrc,
  attributionFromCookies,
  beatIdFromPath,
  captureAttribution,
  parseSrcParam,
  shouldOverwriteSrc,
  sourceFromReferrer,
} from "./attribution";

describe("parseSrcParam", () => {
  it("returns undefined for missing or empty values", () => {
    expect(parseSrcParam(undefined)).toBeUndefined();
    expect(parseSrcParam(null)).toBeUndefined();
    expect(parseSrcParam("")).toBeUndefined();
    expect(parseSrcParam("   ")).toBeUndefined();
  });

  it("returns allowlisted sources", () => {
    expect(parseSrcParam("whatsapp")).toBe("whatsapp");
    expect(parseSrcParam("instagram")).toBe("instagram");
  });

  it("maps unknown values to other without storing the raw string", () => {
    expect(parseSrcParam("evil<script>")).toBe("other");
    expect(parseSrcParam("not-a-source")).toBe("other");
  });
});

describe("sourceFromReferrer", () => {
  const origin = "https://trishulbeats.com";

  it("maps social hosts", () => {
    expect(sourceFromReferrer("https://www.instagram.com/reel/1", origin)).toBe("instagram");
    expect(sourceFromReferrer("https://youtu.be/abc", origin)).toBe("youtube");
    expect(sourceFromReferrer("https://wa.me/?text=hi", origin)).toBe("whatsapp");
    expect(sourceFromReferrer("https://web.whatsapp.com/", origin)).toBe("whatsapp");
  });

  it("maps same-origin paths", () => {
    expect(sourceFromReferrer("https://trishulbeats.com/beats", origin)).toBe("marketplace");
    expect(sourceFromReferrer("https://trishulbeats.com/beats?search=trap", origin)).toBe("search");
    expect(sourceFromReferrer("https://trishulbeats.com/producer/arjun", origin)).toBe("profile");
    expect(sourceFromReferrer("https://trishulbeats.com/embed/abc", origin)).toBe("embed");
    expect(sourceFromReferrer("https://trishulbeats.com/charts", origin)).toBe("charts");
    expect(sourceFromReferrer("https://trishulbeats.com/offer/tok", origin)).toBe("offer");
  });

  it("does not fill from an internal PDP", () => {
    expect(
      sourceFromReferrer("https://trishulbeats.com/beats/507f1f77bcf86cd799439011", origin)
    ).toBeUndefined();
  });

  it("maps unknown external hosts to other", () => {
    expect(sourceFromReferrer("https://google.com/", origin)).toBe("other");
  });

  it("returns undefined when referrer is missing", () => {
    expect(sourceFromReferrer("", origin)).toBeUndefined();
    expect(sourceFromReferrer(undefined, origin)).toBeUndefined();
  });
});

describe("appendSrc", () => {
  it("adds src to absolute and relative URLs", () => {
    expect(appendSrc("https://trishulbeats.com/beats/abc", "whatsapp")).toBe(
      "https://trishulbeats.com/beats/abc?src=whatsapp"
    );
    expect(appendSrc("/beats/abc", "charts")).toBe("/beats/abc?src=charts");
  });
});

describe("attributionFromCookies", () => {
  it("defaults missing cookie to direct", () => {
    expect(attributionFromCookies({ get: () => undefined })).toEqual({ source: "direct" });
  });

  it("reads allowlisted source and beat id", () => {
    const cookies = {
      get(name: string) {
        if (name === SRC_COOKIE) return { value: "instagram" };
        if (name === "tb_src_beat") return { value: "507f1f77bcf86cd799439011" };
        return undefined;
      },
    };
    expect(attributionFromCookies(cookies)).toEqual({
      source: "instagram",
      beatId: "507f1f77bcf86cd799439011",
    });
  });

  it("ignores junk src values by mapping to other", () => {
    expect(
      attributionFromCookies({
        get: (name: string) => (name === SRC_COOKIE ? { value: "hack" } : undefined),
      })
    ).toEqual({ source: "other" });
  });
});

describe("captureAttribution overwrite window", () => {
  it("skips a newer campaign within 30 minutes", () => {
    const store: Record<string, string> = {
      [SRC_COOKIE]: "instagram",
      [SRC_TS_COOKIE]: "1000",
    };
    captureAttribution({
      pathname: "/beats",
      srcParam: "whatsapp",
      referrer: "",
      origin: "https://trishulbeats.com",
      now: 1000 + SRC_OVERWRITE_WINDOW_MS - 1,
      cookies: {
        get: (name) => store[name],
        set: (name, value) => {
          store[name] = value;
        },
      },
    });
    expect(store[SRC_COOKIE]).toBe("instagram");
  });

  it("overwrites after 30 minutes", () => {
    const store: Record<string, string> = {
      [SRC_COOKIE]: "instagram",
      [SRC_TS_COOKIE]: "1000",
    };
    captureAttribution({
      pathname: "/beats",
      srcParam: "whatsapp",
      referrer: "",
      origin: "https://trishulbeats.com",
      now: 1000 + SRC_OVERWRITE_WINDOW_MS,
      cookies: {
        get: (name) => store[name],
        set: (name, value) => {
          store[name] = value;
        },
      },
    });
    expect(store[SRC_COOKIE]).toBe("whatsapp");
  });

  it("fills from referrer only when the cookie is empty", () => {
    const store: Record<string, string> = {};
    captureAttribution({
      pathname: "/",
      srcParam: null,
      referrer: "https://www.instagram.com/",
      origin: "https://trishulbeats.com",
      now: 5_000,
      cookies: {
        get: (name) => store[name],
        set: (name, value) => {
          store[name] = value;
        },
      },
    });
    expect(store[SRC_COOKIE]).toBe("instagram");
  });
});

describe("helpers", () => {
  it("extracts a PDP beat id", () => {
    expect(beatIdFromPath("/beats/507f1f77bcf86cd799439011")).toBe("507f1f77bcf86cd799439011");
    expect(beatIdFromPath("/beats")).toBeUndefined();
  });

  it("does not overwrite a fresh timestamp", () => {
    expect(shouldOverwriteSrc(1_000, 1_000 + 1_000)).toBe(false);
    expect(shouldOverwriteSrc(undefined, 1_000)).toBe(true);
  });
});
