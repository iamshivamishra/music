import { NextRequest } from "next/server";
import { serviceJobService } from "@/lib/services/service-job.service";
import { authorizeCron } from "@/lib/cron-auth";
import { formatErrorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    authorizeCron(request);

    const expired = await serviceJobService.expireStaleJobs();
    return Response.json({ ok: true, expired });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";
