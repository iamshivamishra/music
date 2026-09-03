import { NextRequest } from "next/server";
import { licenseVerifyService } from "@/lib/services/license-verify.service";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyLicenseSchema as verifySchema } from "@/lib/validators/license";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { success, resetAt } = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "license-verify" });
    if (!success) return rateLimitResponse(resetAt);

    const body = await request.json();
    const { licenseNumber, verificationHash } = verifySchema.parse(body);

    let certificate: Awaited<ReturnType<typeof licenseVerifyService.verifyByLicenseNumber>> = null;

    if (licenseNumber) {
      certificate = await licenseVerifyService.verifyByLicenseNumber(licenseNumber);
    } else if (verificationHash) {
      certificate = await licenseVerifyService.verifyByHash(verificationHash);
    }

    if (!certificate) {
      return Response.json(
        { valid: false, error: "License not found" },
        { status: 404 }
      );
    }

    return Response.json({
      valid: true,
      certificate: {
        licenseNumber: certificate.licenseNumber,
        buyerName: certificate.buyerName,
        itemTitle: certificate.itemTitle,
        itemType: certificate.itemType,
        licenseType: certificate.licenseType,
        purchaseDate: certificate.purchaseDate,
        includesWav: certificate.includesWav,
        includesStems: certificate.includesStems,
      },
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";
