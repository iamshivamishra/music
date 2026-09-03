import { NextRequest, NextResponse } from "next/server";
import { foundingLifecycleService } from "@/lib/services/foundingLifecycle.service";
import { authorizeCron } from "@/lib/cron-auth";
import { formatErrorResponse } from "@/lib/errors";

async function handle(request: NextRequest) {
  try {
    authorizeCron(request);
    const result = await foundingLifecycleService.runDailyJobs();
    return NextResponse.json({ ok: true, ...result });
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
