import { serviceListingRepository } from "@/lib/repositories/service-listing.repository";
import { serviceJobRepository } from "@/lib/repositories/service-job.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { withFeatureFlag } from "@/lib/assert-feature";
import { toPublicServiceListing, type PublicServiceListingDto } from "@/lib/serializers/service-listing";
import type { CreateServiceListingInput, UpdateServiceListingInput } from "@/lib/validators/service-listing";
import type { IServiceListing, PaginatedResult, ServiceListingStatus } from "@/types";
import { OPEN_SERVICE_JOB_STATUSES } from "@/lib/validators/service-job";

export const MAX_LISTINGS_PER_PRODUCER = 10;

function assertProducer(role: string): void {
  if (role !== "producer" && role !== "admin") {
    throw new ForbiddenError("Only producers can manage services");
  }
}

function assertOwner(listing: IServiceListing, producerId: string): void {
  if (listing.producerId.toString() !== producerId) {
    throw new ForbiddenError("You can only manage your own services");
  }
}

export const serviceListingService = withFeatureFlag("customServices", {
  async list(
    producerId: string,
    status?: ServiceListingStatus,
    page?: number,
    limit?: number
  ): Promise<PaginatedResult<IServiceListing>> {
    return serviceListingRepository.findByProducerPaginated(
      producerId,
      status,
      page,
      limit
    );
  },

  async getForOwner(listingId: string, producerId: string): Promise<IServiceListing> {
    const listing = await serviceListingRepository.findById(listingId);
    if (!listing) throw new NotFoundError("Service");
    assertOwner(listing, producerId);
    return listing;
  },

  async getPublishedById(listingId: string): Promise<PublicServiceListingDto | null> {
    const listing = await serviceListingRepository.findById(listingId);
    if (!listing || listing.status !== "published") return null;
    const producer = await userRepository.findById(listing.producerId.toString());
    return toPublicServiceListing(listing, producer);
  },

  async listPublishedForProducer(producerId: string): Promise<IServiceListing[]> {
    return serviceListingRepository.findPublishedByProducer(producerId);
  },

  async create(
    producerId: string,
    role: string,
    input: CreateServiceListingInput
  ): Promise<IServiceListing> {
    assertProducer(role);
    const count = await serviceListingRepository.countByProducer(producerId);
    if (count >= MAX_LISTINGS_PER_PRODUCER) {
      throw new ValidationError("You can publish at most 10 services", {
        title: [`Maximum of ${MAX_LISTINGS_PER_PRODUCER} listings reached`],
      });
    }

    const listing = await serviceListingRepository.create({
      ...input,
      producerId: producerId as unknown as IServiceListing["producerId"],
      extras: input.extras ?? [],
    });

    audit({
      action: "service.listing_created",
      userId: producerId,
      resourceType: "service_listing",
      resourceId: listing._id.toString(),
    });
    return listing;
  },

  async update(
    listingId: string,
    producerId: string,
    role: string,
    input: UpdateServiceListingInput
  ): Promise<IServiceListing> {
    assertProducer(role);
    const listing = await serviceListingRepository.findById(listingId);
    if (!listing) throw new NotFoundError("Service");
    assertOwner(listing, producerId);

    const updated = await serviceListingRepository.update(listingId, input);
    if (!updated) throw new NotFoundError("Service");

    audit({
      action: "service.listing_updated",
      userId: producerId,
      resourceType: "service_listing",
      resourceId: listingId,
    });
    return updated;
  },

  async delete(listingId: string, producerId: string, role: string): Promise<void> {
    assertProducer(role);
    const listing = await serviceListingRepository.findById(listingId);
    if (!listing) throw new NotFoundError("Service");
    assertOwner(listing, producerId);

    const openJobs = await serviceJobRepository.countOpenByListing(
      listingId,
      OPEN_SERVICE_JOB_STATUSES
    );
    if (openJobs > 0) {
      throw new ValidationError("Cannot delete a listing with open jobs", {
        status: ["Pause the listing instead. Open jobs must finish first."],
      });
    }

    await serviceListingRepository.delete(listingId);
    audit({
      action: "service.listing_deleted",
      userId: producerId,
      resourceType: "service_listing",
      resourceId: listingId,
    });
  },
});
