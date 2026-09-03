import { z } from "zod";
import rawFlags from "../../config/feature-flags.json";

/**
 * Feature flags for plans 16–25. Toggle values in `config/feature-flags.json`
 * (defaults are all `true`). Restart the app, or let `next dev` reload, after
 * changing the file. Missing keys stay enabled.
 */

export const FEATURE_FLAG_KEYS = [
  "whatsappSaleAlerts",
  "linkInBioStore",
  "customOffers",
  "privateDrops",
  "sourceAnalytics",
  "buyerCrm",
  "customServices",
  "collabSplits",
  "freeDownloadLeads",
  "producerTaxPack",
] as const;

export type FeatureFlag = (typeof FEATURE_FLAG_KEYS)[number];

export type FeatureFlags = Record<FeatureFlag, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  whatsappSaleAlerts: true,
  linkInBioStore: true,
  customOffers: true,
  privateDrops: true,
  sourceAnalytics: true,
  buyerCrm: true,
  customServices: true,
  collabSplits: true,
  freeDownloadLeads: true,
  producerTaxPack: true,
};

const featureFlagsSchema = z.object(
  Object.fromEntries(
    FEATURE_FLAG_KEYS.map((key) => [key, z.boolean().optional()])
  ) as Record<FeatureFlag, z.ZodOptional<z.ZodBoolean>>
);

const FEATURE_HTTP_GATES: { flag: FeatureFlag; prefixes: string[] }[] = [
  { flag: "linkInBioStore", prefixes: ["/studio/store", "/api/studio/store"] },
  {
    flag: "customOffers",
    prefixes: ["/studio/offers", "/offer", "/api/offers", "/api/payment/offer"],
  },
  { flag: "sourceAnalytics", prefixes: ["/studio/analytics", "/api/studio/analytics/funnel"] },
  { flag: "buyerCrm", prefixes: ["/studio/customers", "/api/studio/customers"] },
  {
    flag: "customServices",
    prefixes: [
      "/studio/services",
      "/studio/jobs",
      "/profile/jobs",
      "/services",
      "/admin/jobs",
      "/api/services",
      "/api/service-jobs",
      "/api/admin/jobs",
      "/api/cron/service-jobs",
    ],
  },
  {
    flag: "collabSplits",
    prefixes: ["/studio/collabs", "/api/studio/collabs"],
  },
  {
    flag: "freeDownloadLeads",
    prefixes: ["/studio/leads", "/api/studio/leads"],
  },
  { flag: "producerTaxPack", prefixes: ["/studio/tax", "/api/studio/tax"] },
  { flag: "privateDrops", prefixes: ["/api/cron/publish-scheduled"] },
];

function pathMatches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function parseFlags(raw: unknown): FeatureFlags {
  const parsed = featureFlagsSchema.safeParse(raw);
  const overrides = parsed.success ? parsed.data : {};
  const flags = { ...DEFAULT_FEATURE_FLAGS };
  for (const key of FEATURE_FLAG_KEYS) {
    if (typeof overrides[key] === "boolean") {
      flags[key] = overrides[key];
    }
  }
  return flags;
}

export function getFeatureFlags(): FeatureFlags {
  return parseFlags(rawFlags);
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return getFeatureFlags()[flag] === true;
}

/**
 * Returns the flag that gates this path, if any.
 * `/api/beats/:id/free-download` is the only beats API gated by leads.
 */
export function featureFlagForPath(pathname: string): FeatureFlag | null {
  if (
    pathname.includes("/free-download") &&
    pathMatches(pathname, "/api/beats")
  ) {
    return "freeDownloadLeads";
  }

  if (
    pathname.includes("/collaborators") &&
    pathMatches(pathname, "/api/beats")
  ) {
    return "collabSplits";
  }

  for (const gate of FEATURE_HTTP_GATES) {
    if (gate.prefixes.some((prefix) => pathMatches(pathname, prefix))) {
      return gate.flag;
    }
  }
  return null;
}
