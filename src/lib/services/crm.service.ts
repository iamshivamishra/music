import { producerCustomerRepository } from "@/lib/repositories/producer-customer.repository";
import {
  producerCustomerNoteRepository,
  type CustomerNoteIdentity,
} from "@/lib/repositories/producer-customer-note.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import {
  groupFromPurchases,
  toCustomerDetail,
  toCustomerListItem,
  type CustomerDetail,
  type CustomerListItem,
  type ProducerCustomerGroup,
} from "@/lib/serializers/crm";
import {
  hashEmail,
  parseCustomerKey,
  toCustomerKey,
  type ParsedCustomerKey,
} from "@/lib/crm/customer-key";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { withFeatureFlag } from "@/lib/assert-feature";
import type { IProducerCustomerNote, IUser, PaginatedResult } from "@/types";

interface ResolvedCustomer {
  buyerId?: string;
  guestEmail?: string;
  user: IUser | null;
  deletedUser: boolean;
}

function noteIdentitiesFor(
  buyerId: string | null | undefined,
  email: string | null | undefined
): CustomerNoteIdentity[] {
  const identities: CustomerNoteIdentity[] = [];
  if (buyerId) identities.push({ buyerId });
  if (email) identities.push({ guestEmailHash: hashEmail(email) });
  return identities;
}

function noteForIdentity(
  buyerId: string | null | undefined,
  email: string | null | undefined,
  notesByBuyer: Map<string, IProducerCustomerNote>,
  notesByHash: Map<string, IProducerCustomerNote>
): string | null {
  if (buyerId) {
    const byBuyer = notesByBuyer.get(buyerId);
    if (byBuyer) return byBuyer.note;
  }
  if (email) {
    const byHash = notesByHash.get(hashEmail(email));
    if (byHash) return byHash.note;
  }
  return null;
}

function noteForGroup(
  group: ProducerCustomerGroup,
  notesByBuyer: Map<string, IProducerCustomerNote>,
  notesByHash: Map<string, IProducerCustomerNote>
): string | null {
  return noteForIdentity(
    group.buyerId,
    group.userEmail || group.guestEmail,
    notesByBuyer,
    notesByHash
  );
}

function indexNotes(notes: IProducerCustomerNote[]) {
  const notesByBuyer = new Map<string, IProducerCustomerNote>();
  const notesByHash = new Map<string, IProducerCustomerNote>();
  for (const note of notes) {
    if (note.buyerId) notesByBuyer.set(note.buyerId.toString(), note);
    if (note.guestEmailHash) notesByHash.set(note.guestEmailHash, note);
  }
  return { notesByBuyer, notesByHash };
}

function noteIdentityForResolved(resolved: ResolvedCustomer): CustomerNoteIdentity {
  if (resolved.buyerId) return { buyerId: resolved.buyerId };
  if (resolved.guestEmail) return { guestEmailHash: hashEmail(resolved.guestEmail) };
  throw new ValidationError("Cannot save a note without customer identity");
}

/**
 * Guest rows that share an email with a User are merged onto that buyer
 * in the aggregation pipeline so producers do not see duplicates after signup.
 */
async function resolveCustomer(
  producerId: string,
  parsed: ParsedCustomerKey
): Promise<ResolvedCustomer | null> {
  if (parsed.type === "user") {
    const user = await userRepository.findById(parsed.buyerId);
    const guestEmail = user?.email;
    const exists = await producerCustomerRepository.existsForIdentity(producerId, {
      buyerId: parsed.buyerId,
      guestEmail,
    });
    if (!exists) return null;
    return {
      buyerId: parsed.buyerId,
      guestEmail,
      user,
      deletedUser: !user,
    };
  }

  const emails = await producerCustomerRepository.findDistinctGuestEmailsByProducer(
    producerId
  );
  const guestEmail = emails.find((email) => hashEmail(email) === parsed.hash);
  if (!guestEmail) return null;

  const user = await userRepository.findByEmail(guestEmail);
  return {
    buyerId: user?._id.toString(),
    guestEmail,
    user,
    deletedUser: false,
  };
}

async function findNote(producerId: string, resolved: ResolvedCustomer): Promise<string | null> {
  const email = resolved.deletedUser
    ? null
    : resolved.user?.email || resolved.guestEmail || null;
  const identities = noteIdentitiesFor(resolved.buyerId, email);
  if (identities.length === 0) return null;
  const notes = await producerCustomerNoteRepository.findForIdentities(
    producerId,
    identities
  );
  const { notesByBuyer, notesByHash } = indexNotes(notes);
  return noteForIdentity(resolved.buyerId, email, notesByBuyer, notesByHash);
}

export const crmService = withFeatureFlag("buyerCrm", {
  async listCustomers(
    producerId: string,
    query: { page?: number; limit?: number; q?: string } = {}
  ): Promise<PaginatedResult<CustomerListItem>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);

    const result = await producerCustomerRepository.getCustomersByProducer(
      producerId,
      { page, limit, q: query.q }
    );

    const identities = result.data.flatMap((group) =>
      noteIdentitiesFor(group.buyerId, group.userEmail || group.guestEmail)
    );
    const notes = await producerCustomerNoteRepository.findForIdentities(
      producerId,
      identities
    );
    const { notesByBuyer, notesByHash } = indexNotes(notes);

    const data = result.data.flatMap((group) => {
      const email = group.userEmail || group.guestEmail;
      if (!group.buyerId && !email) return [];
      return [
        toCustomerListItem(
          group,
          toCustomerKey(group.buyerId, email),
          noteForGroup(group, notesByBuyer, notesByHash)
        ),
      ];
    });

    const totalPages = result.totalPages;
    return {
      data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages,
      hasNext: result.page < totalPages,
      hasPrev: result.page > 1,
    };
  },

  async getCustomer(producerId: string, customerKey: string): Promise<CustomerDetail> {
    const parsed = parseCustomerKey(customerKey);
    const resolved = await resolveCustomer(producerId, parsed);
    if (!resolved) throw new NotFoundError("Customer");

    const [purchases, note] = await Promise.all([
      producerCustomerRepository.findPurchasesForIdentity(producerId, {
        buyerId: resolved.buyerId,
        guestEmail: resolved.guestEmail,
      }),
      findNote(producerId, resolved),
    ]);

    if (purchases.length === 0) throw new NotFoundError("Customer");

    const email = resolved.deletedUser
      ? null
      : resolved.user?.email || resolved.guestEmail || null;
    const group = groupFromPurchases(
      {
        buyerId: resolved.buyerId,
        guestEmail: resolved.guestEmail,
        userEmail: email,
        name: resolved.deletedUser
          ? null
          : resolved.user?.displayName || resolved.user?.name || null,
        avatarUrl: resolved.user?.avatarUrl || resolved.user?.image || null,
      },
      purchases
    );

    return toCustomerDetail(
      group,
      toCustomerKey(resolved.buyerId ?? null, email),
      note,
      purchases
    );
  },

  async upsertNote(
    producerId: string,
    customerKey: string,
    note: string
  ): Promise<{ note: string | null }> {
    const parsed = parseCustomerKey(customerKey);
    const resolved = await resolveCustomer(producerId, parsed);
    if (!resolved) throw new NotFoundError("Customer");

    const identity = noteIdentityForResolved(resolved);
    const trimmed = note.trim();
    if (!trimmed) {
      await producerCustomerNoteRepository.delete(producerId, identity);
      return { note: null };
    }

    const saved = await producerCustomerNoteRepository.upsert(
      producerId,
      identity,
      trimmed
    );
    return { note: saved?.note ?? trimmed };
  },
});
