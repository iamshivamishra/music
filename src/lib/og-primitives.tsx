/**
 * Shared primitives for OG image generation.
 * Keeps brand colors and the logo SVG in one place so all
 * opengraph-image / twitter-image / icon files stay consistent.
 */

export const OG_GRADIENT =
  "linear-gradient(135deg, #1a0533 0%, #0f172a 50%, #0c0a1a 100%)";

export const OG_COLORS = {
  white: "#ffffff",
  purple: "#a78bfa",
  purpleLight: "#c4b5fd",
  slate: "#e2e8f0",
  slateSubtle: "#64748b",
  badgePurpleBg: "rgba(168, 85, 247, 0.2)",
  badgePurpleBorder: "rgba(168, 85, 247, 0.4)",
  badgeNeutralBg: "rgba(255, 255, 255, 0.08)",
  badgeNeutralBorder: "rgba(255, 255, 255, 0.15)",
} as const;

export const OG_SIZE = { width: 1200, height: 630 };

export function LogoSvg({ size = 72 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="16" fill="#0F172A" />
      <path
        d="M22 18H42M32 18V46M24 28H40"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="46" cy="44" r="6" fill="#A855F7" />
    </svg>
  );
}
