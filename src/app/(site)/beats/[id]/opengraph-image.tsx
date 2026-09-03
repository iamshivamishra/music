import { ImageResponse } from "next/og";
import { beatService } from "@/lib/services/beat.service";
import { storageService } from "@/lib/services/storage.service";
import {
  OG_GRADIENT,
  OG_COLORS,
  OG_SIZE,
} from "@/lib/og-primitives";

export const runtime = "nodejs";
export const alt = "Beat on Trishul Beats";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function BeatOgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const beat = await beatService.getOgImageData(id);

  if (!beat) {
    return fallbackImage();
  }

  const producerName = beat.producerName;

  let coverSrc: string | null = null;
  if (beat.coverUrl) {
    try {
      const presigned = await storageService.presignCoverUrl(beat.coverUrl);
      const res = await fetch(presigned);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mime = res.headers.get("content-type") || "image/jpeg";
        coverSrc = `data:${mime};base64,${base64}`;
      }
    } catch {
      // Cover fetch failed; render without it.
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: OG_GRADIENT,
          fontFamily: "sans-serif",
          padding: "48px",
        }}
      >
        {coverSrc && (
          <div
            style={{
              display: "flex",
              width: "400px",
              height: "400px",
              borderRadius: "24px",
              overflow: "hidden",
              flexShrink: 0,
              marginRight: "48px",
              alignSelf: "center",
              boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverSrc}
              alt=""
              width={400}
              height={400}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: OG_COLORS.white,
              lineHeight: 1.2,
              marginBottom: "16px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {beat.title}
          </span>
          <span
            style={{
              fontSize: "28px",
              color: OG_COLORS.purple,
              marginBottom: "32px",
            }}
          >
            by {producerName}
          </span>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {beat.genre && (
              <span
                style={{
                  padding: "8px 20px",
                  borderRadius: "9999px",
                  background: OG_COLORS.badgePurpleBg,
                  border: `1px solid ${OG_COLORS.badgePurpleBorder}`,
                  color: OG_COLORS.purpleLight,
                  fontSize: "20px",
                  fontWeight: 500,
                }}
              >
                {beat.genre}
              </span>
            )}
            {beat.bpm && (
              <span
                style={{
                  padding: "8px 20px",
                  borderRadius: "9999px",
                  background: OG_COLORS.badgeNeutralBg,
                  border: `1px solid ${OG_COLORS.badgeNeutralBorder}`,
                  color: OG_COLORS.slate,
                  fontSize: "20px",
                  fontWeight: 500,
                }}
              >
                {beat.bpm} BPM
              </span>
            )}
            {beat.key && (
              <span
                style={{
                  padding: "8px 20px",
                  borderRadius: "9999px",
                  background: OG_COLORS.badgeNeutralBg,
                  border: `1px solid ${OG_COLORS.badgeNeutralBorder}`,
                  color: OG_COLORS.slate,
                  fontSize: "20px",
                  fontWeight: 500,
                }}
              >
                Key: {beat.key}
              </span>
            )}
          </div>
          <span
            style={{
              fontSize: "18px",
              color: OG_COLORS.slateSubtle,
              marginTop: "auto",
              paddingTop: "24px",
            }}
          >
            trishulbeats.com
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}

function fallbackImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: OG_GRADIENT,
          fontFamily: "sans-serif",
        }}
      >
        <span
          style={{ fontSize: "48px", fontWeight: 700, color: OG_COLORS.white }}
        >
          Trishul Beats
        </span>
        <span
          style={{
            fontSize: "24px",
            color: OG_COLORS.purple,
            marginTop: "16px",
          }}
        >
          Beat not found
        </span>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
