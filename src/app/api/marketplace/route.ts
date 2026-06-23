import { NextRequest } from "next/server";
import { beatService } from "@/lib/services/beat.service";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { beatFilterSchema } from "@/lib/validators/beat";
import { formatErrorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const filters = beatFilterSchema.parse(params);
    const result = await beatService.list(filters);

    const producerIds = [...new Set(result.data.map((b) => b.producerId.toString()))];
    const [producerMap, priceMap] = await Promise.all([
      Promise.all(
        producerIds.map(async (id) => {
          const u = await userRepository.findById(id);
          return [id, u ? { name: u.displayName || u.name, username: u.username } : null] as const;
        })
      ).then((entries) => Object.fromEntries(entries)),
      Promise.all(
        result.data.map(async (beat) => {
          const cheapest = await licenseRepository.findCheapestForBeat(beat._id.toString());
          return [beat._id.toString(), cheapest?.price ?? null] as const;
        })
      ).then((entries) => Object.fromEntries(entries)),
    ]);

    const beats = result.data.map((beat) => {
      const id = beat._id.toString();
      const producer = producerMap[beat.producerId.toString()];
      return {
        ...beat,
        startingPrice: priceMap[id] ?? null,
        producerName: producer?.name ?? "Unknown",
        producerUsername: producer?.username ?? null,
      };
    });

    return Response.json({
      beats,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
