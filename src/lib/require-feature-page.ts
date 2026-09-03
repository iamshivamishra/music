import { notFound } from "next/navigation";
import { isFeatureEnabled, type FeatureFlag } from "@/lib/feature-flags";

export function requireFeaturePage(flag: FeatureFlag): void {
  if (!isFeatureEnabled(flag)) notFound();
}
