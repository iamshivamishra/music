import { ImageResponse } from "next/og";
import { LogoSvg } from "@/lib/og-primitives";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<LogoSvg size={180} />, { ...size });
}
