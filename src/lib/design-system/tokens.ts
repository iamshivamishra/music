/**
 * Design System Tokens — Single Source of Truth
 *
 * Theme: Spotify-like dark music UI — true-black surfaces, green accents.
 *
 * Light mode: inverted chrome — black navbar, sidebar, player, and footer
 * with a clean white content area.
 *
 * To change the theme:
 *   1. Edit values here
 *   2. Run `npm run generate:theme`
 *   3. Done — every component picks up the new values
 *
 * Naming: camelCase keys become kebab-case CSS variables.
 *   e.g. `primaryForeground` → `--primary-foreground`
 */

export const tokens = {
  radius: "0.5rem",

  colors: {
    light: {
      background: "oklch(0.99 0 0)",
      foreground: "oklch(0.15 0 0)",

      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.15 0 0)",

      popover: "oklch(1 0 0)",
      popoverForeground: "oklch(0.15 0 0)",

      primary: "oklch(0.72 0.19 145)",
      primaryForeground: "oklch(0.12 0 0)",

      secondary: "oklch(0.95 0 0)",
      secondaryForeground: "oklch(0.22 0 0)",

      muted: "oklch(0.96 0 0)",
      mutedForeground: "oklch(0.45 0 0)",

      accent: "oklch(0.94 0 0)",
      accentForeground: "oklch(0.18 0 0)",

      destructive: "oklch(0.577 0.245 27.325)",

      border: "oklch(0.90 0 0)",
      input: "oklch(0.92 0 0)",
      ring: "oklch(0.72 0.19 145)",

      chart1: "oklch(0.72 0.19 145)",
      chart2: "oklch(0.55 0.08 250)",
      chart3: "oklch(0.45 0 0)",
      chart4: "oklch(0.68 0.16 95)",
      chart5: "oklch(0.58 0.14 20)",

      sidebar: "oklch(0.12 0 0)",
      sidebarForeground: "oklch(0.95 0 0)",
      sidebarPrimary: "oklch(0.72 0.19 145)",
      sidebarPrimaryForeground: "oklch(0.12 0 0)",
      sidebarAccent: "oklch(0.22 0 0)",
      sidebarAccentForeground: "oklch(0.95 0 0)",
      sidebarBorder: "oklch(1 0 0 / 12%)",
      sidebarRing: "oklch(0.72 0.19 145)",

      navbarBg: "oklch(0.12 0 0)",
      navbarForeground: "oklch(0.95 0 0)",

      footerBg: "oklch(0.12 0 0)",
      footerForeground: "oklch(0.95 0 0)",

      playerBg: "oklch(0.18 0 0)",
      playerBorder: "oklch(1 0 0 / 10%)",
      playerMuted: "oklch(0.70 0 0)",
      playerDisabled: "oklch(0.45 0 0)",

      adminBg: "oklch(0.96 0 0)",
      adminMuted: "oklch(0.45 0 0)",

      successBg: "oklch(0.72 0.19 145 / 18%)",
      successText: "oklch(0.45 0.16 145)",

      gradientAccent: "oklch(0.72 0.19 145 / 0.08)",
      progressEnd: "oklch(0.78 0.20 145)",
      playButton: "oklch(0.78 0.20 145)",

      tierPremium: "oklch(0.65 0.14 85)",
      tierPremiumForeground: "oklch(0.18 0.04 85)",
      tierUnlimited: "oklch(0.55 0.08 250)",
      tierUnlimitedForeground: "oklch(0.99 0 0)",
      tierExclusive: "oklch(0.68 0.16 95)",
      tierExclusiveForeground: "oklch(0.15 0.04 95)",

      warningBg: "oklch(0.65 0.16 85 / 15%)",
      warningText: "oklch(0.52 0.14 85)",
      infoBg: "oklch(0.55 0.10 250 / 15%)",
      infoText: "oklch(0.42 0.12 250)",
      errorBg: "oklch(0.55 0.22 25 / 15%)",
      errorText: "oklch(0.50 0.22 25)",

      overlay: "oklch(0 0 0 / 50%)",

      scrollbarTrack: "oklch(0.94 0 0)",
      scrollbarThumb: "oklch(0.78 0 0)",
      scrollbarThumbHover: "oklch(0.72 0.19 145)",
    },

    dark: {
      background: "oklch(0.177 0 0)",
      foreground: "oklch(0.98 0 0)",

      card: "oklch(0.21 0 0)",
      cardForeground: "oklch(0.96 0 0)",

      popover: "oklch(0.21 0 0)",
      popoverForeground: "oklch(0.96 0 0)",

      primary: "oklch(0.78 0.20 145)",
      primaryForeground: "oklch(0.12 0 0)",

      secondary: "oklch(0.26 0 0)",
      secondaryForeground: "oklch(0.92 0 0)",

      muted: "oklch(0.26 0 0)",
      mutedForeground: "oklch(0.72 0 0)",

      accent: "oklch(0.28 0 0)",
      accentForeground: "oklch(0.96 0 0)",

      destructive: "oklch(0.62 0.22 24)",

      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 12%)",
      ring: "oklch(0.78 0.20 145)",

      chart1: "oklch(0.78 0.20 145)",
      chart2: "oklch(0.62 0.08 250)",
      chart3: "oklch(0.55 0 0)",
      chart4: "oklch(0.72 0.16 95)",
      chart5: "oklch(0.62 0.14 20)",

      sidebar: "oklch(0.08 0 0)",
      sidebarForeground: "oklch(0.96 0 0)",
      sidebarPrimary: "oklch(0.78 0.20 145)",
      sidebarPrimaryForeground: "oklch(0.12 0 0)",
      sidebarAccent: "oklch(0.22 0 0)",
      sidebarAccentForeground: "oklch(0.96 0 0)",
      sidebarBorder: "oklch(1 0 0 / 10%)",
      sidebarRing: "oklch(0.78 0.20 145)",

      navbarBg: "oklch(0.08 0 0)",
      navbarForeground: "oklch(0.98 0 0)",

      footerBg: "oklch(0.08 0 0)",
      footerForeground: "oklch(0.98 0 0)",

      playerBg: "oklch(0.18 0 0)",
      playerBorder: "oklch(1 0 0 / 10%)",
      playerMuted: "oklch(0.70 0 0)",
      playerDisabled: "oklch(0.42 0 0)",

      adminBg: "oklch(0.14 0 0)",
      adminMuted: "oklch(0.70 0 0)",

      successBg: "oklch(0.78 0.20 145 / 18%)",
      successText: "oklch(0.78 0.20 145)",

      gradientAccent: "oklch(0.78 0.20 145 / 0.12)",
      progressEnd: "oklch(0.82 0.20 145)",
      playButton: "oklch(0.78 0.20 145)",

      tierPremium: "oklch(0.72 0.14 85)",
      tierPremiumForeground: "oklch(0.16 0.04 85)",
      tierUnlimited: "oklch(0.62 0.08 250)",
      tierUnlimitedForeground: "oklch(0.99 0 0)",
      tierExclusive: "oklch(0.74 0.16 95)",
      tierExclusiveForeground: "oklch(0.14 0.04 95)",

      warningBg: "oklch(0.72 0.16 85 / 18%)",
      warningText: "oklch(0.78 0.16 85)",
      infoBg: "oklch(0.60 0.10 250 / 18%)",
      infoText: "oklch(0.70 0.10 250)",
      errorBg: "oklch(0.60 0.22 25 / 18%)",
      errorText: "oklch(0.68 0.22 25)",

      overlay: "oklch(0 0 0 / 60%)",

      scrollbarTrack: "oklch(0.14 0 0)",
      scrollbarThumb: "oklch(0.30 0 0)",
      scrollbarThumbHover: "oklch(0.78 0.20 145)",
    },
  },

  brand: {
    primaryHex: "#1DB954",
  },
} as const;

export type ThemeColors = typeof tokens.colors.light;
export type ColorToken = keyof ThemeColors;
