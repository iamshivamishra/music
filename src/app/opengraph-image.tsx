import { ImageResponse } from "next/og";
import {
  OG_GRADIENT,
  OG_COLORS,
  OG_SIZE,
  LogoSvg,
} from "@/lib/og-primitives";

export const runtime = "edge";
export const alt = "Trishul Beats — Beat Marketplace";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OgImage() {
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <LogoSvg size={72} />
          <span
            style={{
              fontSize: "56px",
              fontWeight: 700,
              color: OG_COLORS.white,
              letterSpacing: "-1px",
            }}
          >
            Trishul Beats
          </span>
        </div>
        <span
          style={{
            fontSize: "28px",
            color: OG_COLORS.purple,
            fontWeight: 400,
          }}
        >
          Discover &amp; license high-quality beats
        </span>
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "40px",
          }}
        >
          {["Hip Hop", "Trap", "R&B", "Pop", "Drill"].map((genre) => (
            <span
              key={genre}
              style={{
                padding: "8px 20px",
                borderRadius: "9999px",
                background: OG_COLORS.badgePurpleBg,
                border: `1px solid ${OG_COLORS.badgePurpleBorder}`,
                color: OG_COLORS.purpleLight,
                fontSize: "18px",
                fontWeight: 500,
              }}
            >
              {genre}
            </span>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
