import { NotFoundError } from "@/lib/errors";
import {
  isFeatureEnabled,
  type FeatureFlag,
} from "@/lib/feature-flags";

const FEATURE_RESOURCES: Record<FeatureFlag, string> = {
  whatsappSaleAlerts: "WhatsApp alerts",
  linkInBioStore: "Store",
  customOffers: "Offers",
  privateDrops: "Private drops",
  sourceAnalytics: "Analytics",
  buyerCrm: "Customers",
  customServices: "Services",
  collabSplits: "Collabs",
  freeDownloadLeads: "Leads",
  producerTaxPack: "Tax",
};

export function assertFeatureEnabled(
  flag: FeatureFlag,
  resource = FEATURE_RESOURCES[flag]
): void {
  if (!isFeatureEnabled(flag)) {
    throw new NotFoundError(resource);
  }
}

export function withFeatureFlag<T extends object>(
  flag: FeatureFlag,
  service: T,
  resource = FEATURE_RESOURCES[flag]
): T {
  return new Proxy(service, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return function (this: unknown, ...args: unknown[]) {
        assertFeatureEnabled(flag, resource);
        return value.apply(target, args);
      };
    },
  });
}
