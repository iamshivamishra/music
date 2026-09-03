"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  SRC_COOKIE_MAX_AGE,
  captureAttribution,
  parseCookieHeader,
} from "@/lib/attribution";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default function AttributionCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isFeatureEnabled("sourceAnalytics")) return;
    const jar = parseCookieHeader(document.cookie);
    captureAttribution({
      pathname,
      srcParam: searchParams.get("src"),
      referrer: document.referrer,
      origin: window.location.origin,
      cookies: {
        get(name) {
          return jar[name];
        },
        set(name, value, maxAge = SRC_COOKIE_MAX_AGE) {
          jar[name] = value;
          document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
        },
      },
    });
  }, [pathname, searchParams]);

  return null;
}
