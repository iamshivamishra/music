import { NextRequest } from "next/server";
import { beatService } from "@/lib/services/beat.service";
import { formatErrorResponse } from "@/lib/errors";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await beatService.incrementPlays(id);
    return Response.json({ success: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
