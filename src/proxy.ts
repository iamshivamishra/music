import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { featureFlagForPath, isFeatureEnabled } from "@/lib/feature-flags";

function gateDisabledFeature(request: NextRequest) {
  const flag = featureFlagForPath(request.nextUrl.pathname);
  if (!flag || isFeatureEnabled(flag)) {
    return null;
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.rewrite(new URL("/feature-disabled", request.url));
}

export const proxy = auth((request) => {
  return gateDisabledFeature(request) ?? NextResponse.next();
});

export const config = {
  matcher: [
    "/beats/:id",
    "/upload/:path*",
    "/profile/:path*",
    "/dashboard/:path*",
    "/studio/:path*",
    "/admin/:path*",
    "/onboarding",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/offer/:path*",
    "/services/:path*",
    "/api/studio/:path*",
    "/api/offers/:path*",
    "/api/payment/offer/:path*",
    "/api/services/:path*",
    "/api/service-jobs/:path*",
    "/api/admin/jobs/:path*",
    "/api/cron/:path*",
    "/api/beats/:path*",
  ],
};
