import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import BeatEvent from "@/lib/models/BeatEvent";
import { toValidObjectIdOrNull } from "@/lib/security/object-id";
import type { AttributionSource, BeatEventKind } from "@/types";

export interface BeatEventInsert {
  beatId: string;
  producerId: string;
  kind: BeatEventKind;
  source: AttributionSource;
}

export interface FunnelKindCount {
  kind: BeatEventKind;
  count: number;
}

export interface FunnelSourceKindCount {
  source: AttributionSource;
  kind: BeatEventKind;
  count: number;
}

export interface FunnelBeatKindCount {
  beatId: string;
  kind: BeatEventKind;
  count: number;
}

export interface FunnelAggregate {
  byKind: FunnelKindCount[];
  bySourceAndKind: FunnelSourceKindCount[];
  byBeatAndKind: FunnelBeatKindCount[];
}

export const beatEventRepository = {
  async insert(data: BeatEventInsert): Promise<void> {
    await connectDB();
    const beatId = toValidObjectIdOrNull(data.beatId);
    const producerId = toValidObjectIdOrNull(data.producerId);
    if (!beatId || !producerId) return;

    const now = new Date();
    await BeatEvent.collection.insertOne({
      beatId,
      producerId,
      kind: data.kind,
      source: data.source,
      createdAt: now,
      updatedAt: now,
    });
  },

  async aggregateFunnel(
    producerId: string,
    from: Date,
    to: Date
  ): Promise<FunnelAggregate> {
    await connectDB();
    const producerObjectId = toValidObjectIdOrNull(producerId);
    if (!producerObjectId) {
      return { byKind: [], bySourceAndKind: [], byBeatAndKind: [] };
    }

    const match = {
      producerId: producerObjectId,
      createdAt: { $gte: from, $lte: to },
    };

    const [result] = await BeatEvent.aggregate<{
      byKind: FunnelKindCount[];
      bySourceAndKind: FunnelSourceKindCount[];
      byBeatAndKind: {
        beatId: mongoose.Types.ObjectId;
        kind: BeatEventKind;
        count: number;
      }[];
    }>([
      { $match: match },
      {
        $facet: {
          byKind: [
            { $group: { _id: "$kind", count: { $sum: 1 } } },
            { $project: { _id: 0, kind: "$_id", count: 1 } },
          ],
          bySourceAndKind: [
            {
              $group: {
                _id: { source: "$source", kind: "$kind" },
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                source: "$_id.source",
                kind: "$_id.kind",
                count: 1,
              },
            },
          ],
          byBeatAndKind: [
            {
              $group: {
                _id: { beatId: "$beatId", kind: "$kind" },
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                beatId: "$_id.beatId",
                kind: "$_id.kind",
                count: 1,
              },
            },
          ],
        },
      },
    ]);

    return {
      byKind: result?.byKind ?? [],
      bySourceAndKind: result?.bySourceAndKind ?? [],
      byBeatAndKind: (result?.byBeatAndKind ?? []).map((row) => ({
        beatId: row.beatId.toString(),
        kind: row.kind,
        count: row.count,
      })),
    };
  },
};
