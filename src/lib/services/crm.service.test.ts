import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "crypto";
import { NotFoundError } from "@/lib/errors";
import type { IProducerCustomerNote, IUser } from "@/types";
import type { ProducerCustomerGroup } from "@/lib/serializers/crm";

vi.mock("@/lib/repositories/producer-customer.repository", () => ({
  producerCustomerRepository: {
    getCustomersByProducer: vi.fn(),
    findPurchasesForIdentity: vi.fn(),
    findDistinctGuestEmailsByProducer: vi.fn(),
    existsForIdentity: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/producer-customer-note.repository", () => ({
  producerCustomerNoteRepository: {
    findForIdentities: vi.fn(),
    findOne: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
    findByEmail: vi.fn(),
  },
}));

import { crmService } from "./crm.service";
import { producerCustomerRepository } from "@/lib/repositories/producer-customer.repository";
import { producerCustomerNoteRepository } from "@/lib/repositories/producer-customer-note.repository";
import { userRepository } from "@/lib/repositories/user.repository";

const PRODUCER_A = "64b1f1c2a1b2c3d4e5f60708";
const PRODUCER_B = "64b1f1c2a1b2c3d4e5f60709";
const BUYER_ID = "64b1f1c2a1b2c3d4e5f60111";
const GUEST_EMAIL = "guest@example.com";

function emailKey(email: string) {
  return `email:${createHash("sha256").update(email.toLowerCase()).digest("hex")}`;
}

function makeGroup(overrides: Partial<ProducerCustomerGroup> = {}): ProducerCustomerGroup {
  return {
    buyerId: BUYER_ID,
    guestEmail: null,
    userEmail: "buyer@example.com",
    name: "Ada",
    avatarUrl: null,
    orderCount: 2,
    spend: 1500,
    lastPurchaseAt: new Date("2026-04-01T00:00:00.000Z"),
    licenseTypes: ["premium", "premium", "basic"],
    ...overrides,
  };
}

function makeUser(overrides: Partial<IUser> = {}): IUser {
  return {
    _id: BUYER_ID,
    name: "Ada",
    email: "buyer@example.com",
    role: "buyer",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("crmService.listCustomers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(producerCustomerNoteRepository.findForIdentities).mockResolvedValue([]);
  });

  it("maps a user group to a user: customerKey and dominant license", async () => {
    vi.mocked(producerCustomerRepository.getCustomersByProducer).mockResolvedValueOnce({
      data: [makeGroup()],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const result = await crmService.listCustomers(PRODUCER_A, { page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].customerKey).toBe(`user:${BUYER_ID}`);
    expect(result.data[0].dominantLicense).toBe("premium");
    expect(result.data[0].email).toBe("buyer@example.com");
  });

  it("maps a guest-only group to an email: hash key", async () => {
    vi.mocked(producerCustomerRepository.getCustomersByProducer).mockResolvedValueOnce({
      data: [
        makeGroup({
          buyerId: null,
          userEmail: null,
          name: null,
          guestEmail: GUEST_EMAIL,
          licenseTypes: ["basic"],
        }),
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const result = await crmService.listCustomers(PRODUCER_A);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].customerKey).toBe(emailKey(GUEST_EMAIL));
    expect(result.data[0].name).toBe(GUEST_EMAIL);
    expect(result.data[0].email).toBe(GUEST_EMAIL);
  });

  it("treats a merged guest+user row as a single user customer", async () => {
    vi.mocked(producerCustomerRepository.getCustomersByProducer).mockResolvedValueOnce({
      data: [
        makeGroup({
          buyerId: BUYER_ID,
          guestEmail: GUEST_EMAIL,
          userEmail: "buyer@example.com",
          orderCount: 3,
        }),
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const result = await crmService.listCustomers(PRODUCER_A);

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].customerKey).toBe(`user:${BUYER_ID}`);
    expect(result.data[0].orderCount).toBe(3);
  });

  it("scopes listing to the session producerId", async () => {
    vi.mocked(producerCustomerRepository.getCustomersByProducer).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });

    await crmService.listCustomers(PRODUCER_A, { page: 1 });
    await crmService.listCustomers(PRODUCER_B, { page: 1 });

    expect(producerCustomerRepository.getCustomersByProducer).toHaveBeenNthCalledWith(
      1,
      PRODUCER_A,
      expect.objectContaining({ page: 1 })
    );
    expect(producerCustomerRepository.getCustomersByProducer).toHaveBeenNthCalledWith(
      2,
      PRODUCER_B,
      expect.objectContaining({ page: 1 })
    );
  });

  it("returns pagination totals after merge", async () => {
    vi.mocked(producerCustomerRepository.getCustomersByProducer).mockResolvedValueOnce({
      data: [makeGroup(), makeGroup({ buyerId: "64b1f1c2a1b2c3d4e5f60222" })],
      total: 3,
      page: 1,
      limit: 2,
      totalPages: 2,
    });

    const result = await crmService.listCustomers(PRODUCER_A, { page: 1, limit: 2 });

    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(2);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(false);
    expect(result.data).toHaveLength(2);
  });

  it("labels deleted buyers and hides email", async () => {
    vi.mocked(producerCustomerRepository.getCustomersByProducer).mockResolvedValueOnce({
      data: [
        makeGroup({
          name: null,
          userEmail: null,
          guestEmail: null,
          avatarUrl: null,
        }),
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const result = await crmService.listCustomers(PRODUCER_A);

    expect(result.data[0].name).toBe("Deleted user");
    expect(result.data[0].email).toBeNull();
  });

  it("attaches a private note snippet", async () => {
    const note: IProducerCustomerNote = {
      _id: "n1",
      producerId: PRODUCER_A,
      buyerId: BUYER_ID,
      note: "Repeat buyer, prefers premium.",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(producerCustomerNoteRepository.findForIdentities).mockResolvedValueOnce([
      note,
    ]);
    vi.mocked(producerCustomerRepository.getCustomersByProducer).mockResolvedValueOnce({
      data: [makeGroup()],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const result = await crmService.listCustomers(PRODUCER_A);

    expect(result.data[0].noteSnippet).toBe("Repeat buyer, prefers premium.");
    expect(producerCustomerNoteRepository.findForIdentities).toHaveBeenCalledWith(
      PRODUCER_A,
      expect.arrayContaining([{ buyerId: BUYER_ID }])
    );
  });
});

describe("crmService.getCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(producerCustomerNoteRepository.findForIdentities).mockResolvedValue([]);
  });

  it("loads history for a user key including guest email purchases", async () => {
    vi.mocked(userRepository.findById).mockResolvedValueOnce(makeUser());
    vi.mocked(producerCustomerRepository.existsForIdentity).mockResolvedValueOnce(true);
    vi.mocked(producerCustomerRepository.findPurchasesForIdentity).mockResolvedValue([
      {
        purchaseId: "p1",
        title: "Night Drive",
        kind: "beat",
        licenseType: "premium",
        amount: 999,
        purchasedAt: new Date("2026-04-02T00:00:00.000Z"),
      },
    ]);

    const result = await crmService.getCustomer(PRODUCER_A, `user:${BUYER_ID}`);

    expect(producerCustomerRepository.existsForIdentity).toHaveBeenCalledWith(
      PRODUCER_A,
      { buyerId: BUYER_ID, guestEmail: "buyer@example.com" }
    );
    expect(producerCustomerRepository.findPurchasesForIdentity).toHaveBeenCalledTimes(1);
    expect(result.purchases).toHaveLength(1);
    expect(result.email).toBe("buyer@example.com");
    expect(result.name).toBe("Ada");
  });

  it("resolves an email key from distinct guest emails", async () => {
    vi.mocked(
      producerCustomerRepository.findDistinctGuestEmailsByProducer
    ).mockResolvedValueOnce([GUEST_EMAIL]);
    vi.mocked(userRepository.findByEmail).mockResolvedValueOnce(null);
    vi.mocked(producerCustomerRepository.findPurchasesForIdentity).mockResolvedValue([
      {
        purchaseId: "p2",
        title: "Pack One",
        kind: "pack",
        licenseType: "basic",
        amount: 499,
        purchasedAt: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);

    const result = await crmService.getCustomer(PRODUCER_A, emailKey(GUEST_EMAIL));

    expect(result.email).toBe(GUEST_EMAIL);
    expect(result.purchases[0].title).toBe("Pack One");
  });

  it("throws NotFoundError when the customer has no purchases for this producer", async () => {
    vi.mocked(userRepository.findById).mockResolvedValueOnce(makeUser());
    vi.mocked(producerCustomerRepository.existsForIdentity).mockResolvedValueOnce(false);

    await expect(
      crmService.getCustomer(PRODUCER_A, `user:${BUYER_ID}`)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(producerCustomerRepository.findPurchasesForIdentity).not.toHaveBeenCalled();
  });
});

describe("crmService.upsertNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepository.findById).mockResolvedValue(makeUser());
    vi.mocked(producerCustomerRepository.existsForIdentity).mockResolvedValue(true);
  });

  it("deletes the note document when the note is empty", async () => {
    vi.mocked(producerCustomerNoteRepository.delete).mockResolvedValueOnce(true);

    const result = await crmService.upsertNote(PRODUCER_A, `user:${BUYER_ID}`, "   ");

    expect(producerCustomerNoteRepository.delete).toHaveBeenCalledWith(PRODUCER_A, {
      buyerId: BUYER_ID,
    });
    expect(producerCustomerNoteRepository.upsert).not.toHaveBeenCalled();
    expect(producerCustomerRepository.findPurchasesForIdentity).not.toHaveBeenCalled();
    expect(result.note).toBeNull();
  });

  it("upserts a note scoped to the producer", async () => {
    vi.mocked(producerCustomerNoteRepository.upsert).mockResolvedValueOnce({
      _id: "n1",
      producerId: PRODUCER_A,
      buyerId: BUYER_ID,
      note: "VIP",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await crmService.upsertNote(PRODUCER_A, `user:${BUYER_ID}`, "VIP");

    expect(producerCustomerNoteRepository.upsert).toHaveBeenCalledWith(
      PRODUCER_A,
      { buyerId: BUYER_ID },
      "VIP"
    );
    expect(result.note).toBe("VIP");
  });

  it("does not save a note for another producer's customer", async () => {
    vi.mocked(producerCustomerRepository.existsForIdentity).mockResolvedValueOnce(false);

    await expect(
      crmService.upsertNote(PRODUCER_B, `user:${BUYER_ID}`, "nope")
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(producerCustomerNoteRepository.upsert).not.toHaveBeenCalled();
  });
});
