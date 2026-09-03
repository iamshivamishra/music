import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import type { IServiceListing } from "@/types";

vi.mock("@/lib/repositories/service-listing.repository", () => ({
  serviceListingRepository: {
    findById: vi.fn(),
    findByProducerPaginated: vi.fn(),
    findPublishedByProducer: vi.fn(),
    countByProducer: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/service-job.repository", () => ({
  serviceJobRepository: {
    countOpenByListing: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: { findById: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

import { serviceListingService, MAX_LISTINGS_PER_PRODUCER } from "./service-listing.service";
import { OPEN_SERVICE_JOB_STATUSES } from "@/lib/validators/service-job";
import { serviceListingRepository } from "@/lib/repositories/service-listing.repository";
import { serviceJobRepository } from "@/lib/repositories/service-job.repository";

const mockedListingRepo = vi.mocked(serviceListingRepository);
const mockedJobRepo = vi.mocked(serviceJobRepository);

function makeListing(overrides: Partial<IServiceListing> = {}): IServiceListing {
  return {
    _id: "listing1",
    producerId: "producer1",
    type: "custom_beat",
    title: "Custom trap beat",
    description: "A custom beat made to your brief within a week.",
    startingPrice: 5000,
    depositPercent: 50,
    turnaroundDays: 7,
    extras: [],
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const validInput = {
  type: "custom_beat" as const,
  title: "Custom trap beat",
  description: "A custom beat made to your brief within a week.",
  startingPrice: 5000,
  depositPercent: 50 as const,
  turnaroundDays: 7,
  extras: [],
  status: "draft" as const,
};

describe("serviceListingService.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a listing for a producer under the cap", async () => {
    mockedListingRepo.countByProducer.mockResolvedValue(2);
    mockedListingRepo.create.mockResolvedValue(makeListing());

    const listing = await serviceListingService.create("producer1", "producer", validInput);
    expect(listing.title).toBe("Custom trap beat");
    expect(mockedListingRepo.create).toHaveBeenCalled();
  });

  it("rejects a 11th listing", async () => {
    mockedListingRepo.countByProducer.mockResolvedValue(MAX_LISTINGS_PER_PRODUCER);
    await expect(
      serviceListingService.create("producer1", "producer", validInput)
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects buyers", async () => {
    await expect(
      serviceListingService.create("buyer1", "buyer", validInput)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("serviceListingService.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks delete when open jobs exist", async () => {
    mockedListingRepo.findById.mockResolvedValue(makeListing());
    mockedJobRepo.countOpenByListing.mockResolvedValue(1);

    await expect(
      serviceListingService.delete("listing1", "producer1", "producer")
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockedJobRepo.countOpenByListing).toHaveBeenCalledWith(
      "listing1",
      OPEN_SERVICE_JOB_STATUSES
    );
    expect(mockedListingRepo.delete).not.toHaveBeenCalled();
  });

  it("deletes when there are no open jobs", async () => {
    mockedListingRepo.findById.mockResolvedValue(makeListing());
    mockedJobRepo.countOpenByListing.mockResolvedValue(0);
    mockedListingRepo.delete.mockResolvedValue(true);

    await serviceListingService.delete("listing1", "producer1", "producer");
    expect(mockedListingRepo.delete).toHaveBeenCalledWith("listing1");
  });

  it("forbids deleting another producer's listing", async () => {
    mockedListingRepo.findById.mockResolvedValue(makeListing());
    await expect(
      serviceListingService.delete("listing1", "other-producer", "producer")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("serviceListingService.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets the owner pause a listing", async () => {
    mockedListingRepo.findById.mockResolvedValue(makeListing({ status: "published" }));
    mockedListingRepo.update.mockResolvedValue(makeListing({ status: "paused" }));

    const updated = await serviceListingService.update(
      "listing1",
      "producer1",
      "producer",
      { status: "paused" }
    );
    expect(updated.status).toBe("paused");
  });

  it("forbids updating another producer's listing", async () => {
    mockedListingRepo.findById.mockResolvedValue(makeListing());
    await expect(
      serviceListingService.update("listing1", "other-producer", "producer", {
        status: "paused",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("serviceListingService.getPublishedById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides paused listings from the public PDP", async () => {
    mockedListingRepo.findById.mockResolvedValue(makeListing({ status: "paused" }));
    await expect(serviceListingService.getPublishedById("listing1")).resolves.toBeNull();
  });
});
