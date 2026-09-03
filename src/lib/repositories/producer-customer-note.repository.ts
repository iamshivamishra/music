import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import ProducerCustomerNote from "@/lib/models/ProducerCustomerNote";
import { toValidObjectIdOrNull } from "@/lib/security/object-id";
import type { IProducerCustomerNote } from "@/types";

export type CustomerNoteIdentity =
  | { buyerId: string }
  | { guestEmailHash: string };

function identityFilter(
  producerOid: mongoose.Types.ObjectId,
  identity: CustomerNoteIdentity
): Record<string, unknown> | null {
  if ("buyerId" in identity) {
    const buyerOid = toValidObjectIdOrNull(identity.buyerId);
    if (!buyerOid) return null;
    return { producerId: producerOid, buyerId: buyerOid };
  }
  if (!identity.guestEmailHash) return null;
  return { producerId: producerOid, guestEmailHash: identity.guestEmailHash };
}

export const producerCustomerNoteRepository = {
  async findOne(
    producerId: string,
    identity: CustomerNoteIdentity
  ): Promise<IProducerCustomerNote | null> {
    await connectDB();
    const producerOid = toValidObjectIdOrNull(producerId);
    if (!producerOid) return null;
    const filter = identityFilter(producerOid, identity);
    if (!filter) return null;
    return ProducerCustomerNote.findOne(filter).lean<IProducerCustomerNote>();
  },

  async findForIdentities(
    producerId: string,
    identities: CustomerNoteIdentity[]
  ): Promise<IProducerCustomerNote[]> {
    await connectDB();
    const producerOid = toValidObjectIdOrNull(producerId);
    if (!producerOid || identities.length === 0) return [];

    const buyerOids: mongoose.Types.ObjectId[] = [];
    const hashes: string[] = [];
    for (const identity of identities) {
      if ("buyerId" in identity) {
        const buyerOid = toValidObjectIdOrNull(identity.buyerId);
        if (buyerOid) buyerOids.push(buyerOid);
      } else if (identity.guestEmailHash) {
        hashes.push(identity.guestEmailHash);
      }
    }

    const or: Record<string, unknown>[] = [];
    if (buyerOids.length > 0) or.push({ buyerId: { $in: buyerOids } });
    if (hashes.length > 0) or.push({ guestEmailHash: { $in: hashes } });
    if (or.length === 0) return [];

    return ProducerCustomerNote.find({ producerId: producerOid, $or: or })
      .select("producerId buyerId guestEmailHash note updatedAt")
      .lean<IProducerCustomerNote[]>();
  },

  async upsert(
    producerId: string,
    identity: CustomerNoteIdentity,
    note: string
  ): Promise<IProducerCustomerNote | null> {
    await connectDB();
    const producerOid = toValidObjectIdOrNull(producerId);
    if (!producerOid) return null;
    const filter = identityFilter(producerOid, identity);
    if (!filter) return null;

    const setFields: Record<string, unknown> = { note, producerId: producerOid };
    if ("buyerId" in identity) {
      setFields.buyerId = filter.buyerId;
    } else {
      setFields.guestEmailHash = identity.guestEmailHash;
    }

    return ProducerCustomerNote.findOneAndUpdate(
      filter,
      { $set: setFields },
      { upsert: true, new: true }
    ).lean<IProducerCustomerNote>();
  },

  async delete(
    producerId: string,
    identity: CustomerNoteIdentity
  ): Promise<boolean> {
    await connectDB();
    const producerOid = toValidObjectIdOrNull(producerId);
    if (!producerOid) return false;
    const filter = identityFilter(producerOid, identity);
    if (!filter) return false;
    const result = await ProducerCustomerNote.deleteOne(filter);
    return result.deletedCount > 0;
  },
};
