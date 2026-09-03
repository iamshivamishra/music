import { NextRequest } from "next/server";
import { beatService } from "@/lib/services/beat.service";
import { authorizeCron } from "@/lib/cron-auth";
import { formatErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

// Fallback if Vercel Cron is unavailable: GitHub Action `curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/publish-scheduled`

async function handle(request: NextRequest) {
  try {
    authorizeCron(request);
    const result = await beatService.publishDueScheduled();
    logger.info("Cron publish-scheduled completed", result);
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export const runtime = "nodejs";
