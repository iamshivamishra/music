import type { ClientSession } from "mongoose";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import { toValidObjectIdOrNull } from "@/lib/security/object-id";
import type { ILead, PaginatedResult } from "@/types";

interface RepoOptions {
  session?: ClientSession;
}

export interface LeadIdentity {
  email?: string;
  whatsappNumber?: string;
}

export interface LeadWriteInput extends LeadIdentity {
  producerId: string;
  beatId: string;
  source: ILead["source"];
  consentAt: Date;
  userId?: string;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

function emptyPage<T>(page: number, limit: number): PaginatedResult<T> {
  return {
    data: [],
    total: 0,
    page,
    limit,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  };
}

function producerFilter(
  producerId: string,
  beatId?: string
): Record<string, unknown> | null {
  const producerOid = toValidObjectIdOrNull(producerId);
  if (!producerOid) return null;
  const filter: Record<string, unknown> = { producerId: producerOid };
  if (beatId) {
    const beatOid = toValidObjectIdOrNull(beatId);
    if (!beatOid) return null;
    filter.beatId = beatOid;
  }
  return filter;
}

function identityFilter(beatId: string, identity: LeadIdentity): Record<string, unknown>[] {
  const clauses: Record<string, unknown>[] = [];
  if (identity.email) clauses.push({ beatId, email: identity.email });
  if (identity.whatsappNumber) {
    clauses.push({ beatId, whatsappNumber: identity.whatsappNumber });
  }
  return clauses;
}

export const leadRepository = {
  async create(data: LeadWriteInput, options: RepoOptions = {}): Promise<ILead> {
    await connectDB();
    const docs = await Lead.create(
      [
        {
          producerId: data.producerId,
          beatId: data.beatId,
          ...(data.email ? { email: data.email } : {}),
          ...(data.whatsappNumber ? { whatsappNumber: data.whatsappNumber } : {}),
          source: data.source,
          consentAt: data.consentAt,
          ...(data.userId ? { userId: data.userId } : {}),
        },
      ],
      { session: options.session }
    );
    return docs[0].toObject() as ILead;
  },

  async findByBeatAndIdentity(
    beatId: string,
    identity: LeadIdentity,
    options: RepoOptions = {}
  ): Promise<ILead | null> {
    await connectDB();
    const clauses = identityFilter(beatId, identity);
    if (clauses.length === 0) return null;
    return Lead.findOne({ $or: clauses })
      .session(options.session ?? null)
      .lean<ILead>();
  },

  async findById(id: string, options: RepoOptions = {}): Promise<ILead | null> {
    await connectDB();
    return Lead.findById(id)
      .session(options.session ?? null)
      .lean<ILead>();
  },

  async updateById(
    id: string,
    data: Partial<Pick<ILead, "email" | "whatsappNumber" | "userId">>,
    options: RepoOptions = {}
  ): Promise<ILead | null> {
    await connectDB();
    const $set: Record<string, unknown> = {};
    if (data.email) $set.email = data.email;
    if (data.whatsappNumber) $set.whatsappNumber = data.whatsappNumber;
    if (data.userId) $set.userId = data.userId;
    if (Object.keys($set).length === 0) {
      return this.findById(id, options);
    }
    return Lead.findByIdAndUpdate(id, { $set }, {
      new: true,
      session: options.session,
    }).lean<ILead>();
  },

  async upsertByIdentity(data: LeadWriteInput, options: RepoOptions = {}): Promise<ILead> {
    const identity = { email: data.email, whatsappNumber: data.whatsappNumber };
    const existing = await this.findByBeatAndIdentity(data.beatId, identity, options);

    if (existing) {
      const patch: Partial<Pick<ILead, "email" | "whatsappNumber" | "userId">> = {};
      if (data.email && !existing.email) patch.email = data.email;
      if (data.whatsappNumber && !existing.whatsappNumber) {
        patch.whatsappNumber = data.whatsappNumber;
      }
      if (data.userId && !existing.userId) patch.userId = data.userId;
      if (Object.keys(patch).length === 0) return existing;
      try {
        return (await this.updateById(existing._id!.toString(), patch, options)) ?? existing;
      } catch (error) {
        if (isDuplicateKeyError(error)) return existing;
        throw error;
      }
    }

    try {
      return await this.create(data, options);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const raced = await this.findByBeatAndIdentity(data.beatId, identity, options);
        if (raced) return raced;
      }
      throw error;
    }
  },

  async listByProducer(
    producerId: string,
    query: { beatId?: string; page: number; limit: number }
  ): Promise<PaginatedResult<ILead>> {
    await connectDB();
    const filter = producerFilter(producerId, query.beatId);
    if (!filter) return emptyPage(query.page, query.limit);

    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean<ILead[]>(),
      Lead.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / query.limit);
    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
      hasNext: query.page < totalPages,
      hasPrev: query.page > 1,
    };
  },

  async distinctBeatIds(producerId: string): Promise<string[]> {
    await connectDB();
    const producerOid = toValidObjectIdOrNull(producerId);
    if (!producerOid) return [];
    const ids = await Lead.distinct("beatId", { producerId: producerOid });
    return ids.map((id) => id.toString());
  },

  async listAllForExport(
    producerId: string,
    query: { beatId?: string; limit: number }
  ): Promise<ILead[]> {
    await connectDB();
    const filter = producerFilter(producerId, query.beatId);
    if (!filter) return [];

    return Lead.find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit)
      .lean<ILead[]>();
  },
};
