import { describe, expect, it } from "vitest";
import {
  buildEmbedSnippet,
  buildEmbedUrl,
  embedIframeSize,
} from "./embed-snippet";

describe("buildEmbedUrl", () => {
  it("builds a single-beat url", () => {
    expect(
      buildEmbedUrl({
        origin: "https://trishulbeats.com",
        beatId: "abc",
        theme: "dark",
        size: "compact",
        kind: "beat",
      })
    ).toBe("https://trishulbeats.com/embed/abc?theme=dark&size=compact");
  });

  it("builds a catalog url", () => {
    expect(
      buildEmbedUrl({
        origin: "https://trishulbeats.com/",
        username: "aryan",
        theme: "light",
        size: "full",
        kind: "catalog",
      })
    ).toBe("https://trishulbeats.com/embed/producer/aryan?theme=light");
  });
});

describe("buildEmbedSnippet", () => {
  it("uses compact iframe dimensions", () => {
    const snippet = buildEmbedSnippet({
      origin: "https://trishulbeats.com",
      beatId: "abc",
      theme: "dark",
      size: "compact",
      kind: "beat",
    });
    expect(snippet.width).toBe(300);
    expect(snippet.height).toBe(80);
    expect(snippet.html).toContain('width="300"');
    expect(snippet.html).toContain('allow="autoplay; encrypted-media"');
  });

  it("uses catalog iframe dimensions", () => {
    expect(embedIframeSize("catalog", "full")).toEqual({
      width: 400,
      height: 500,
    });
  });
});
