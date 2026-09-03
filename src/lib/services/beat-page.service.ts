import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { earningRepository } from "@/lib/repositories/earning.repository";
import { likeRepository } from "@/lib/repositories/like.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { beatQueryService } from "./beat-query.service";
import { toPublicBeatForUi, generateBeatDescription, buildCollabCredits } from "@/lib/serializers/beat";
import { toLicenseDtos } from "@/lib/serializers/license";
import { serializeLean } from "@/lib/serializers/lean";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { canShowFreeDownloadCard } from "@/lib/free-download";
import {
  canViewBeat,
  isListed,
  isOwnerOrAdmin,
  shouldNoIndex,
  type BeatAccessContext,
} from "@/lib/services/beat-access";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { BeatStatus, IBeat } from "@/types";

export const beatPageService = {
  async getStudioBeatsPageData(
    producerId: string,
    status?: BeatStatus,
    page = 1,
    limit = 20
  ) {
    const [result, stats, earnings] = await Promise.all([
      beatQueryService.listByProducer(producerId, status, page, limit),
      beatQueryService.getProducerStats(producerId),
      earningRepository.sumGrossByProducer(producerId),
    ]);

    const beatIds = result.data.map((b) => b._id.toString());
    const [cheapestMap, packMap] = await Promise.all([
      licenseRepository.findCheapestForBeats(beatIds),
      packRepository.findPacksByBeatIds(beatIds),
    ]);

    const beatsWithExtras = result.data.map((beat) => {
      const id = beat._id.toString();
      return {
        ...serializeLean(beat),
        startingPrice: cheapestMap[id]?.price,
        packInfo: packMap.get(id) ?? null,
      };
    });

    return {
      beatsWithExtras,
      stats,
      earnings,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      },
    };
  },

  /**
   * Fetch all data needed for the beat detail page.
   * Returns a fully serialized DTO (strings, not ObjectIds; ISO dates) ready for client components.
   * Returns null if beat not found or not visible to the given user.
   */
  async getDetailPageData(
    beatId: string,
    userId?: string,
    userRole?: string,
    accessToken?: string
  ) {
    const beat = await beatRepository.findById(beatId);
    if (!beat) return null;

    const ctx: BeatAccessContext = { userId, userRole, accessToken };
    const isOwner = isOwnerOrAdmin(beat, ctx);
    if (!canViewBeat(beat, ctx)) {
      return null;
    }

    const canViewUnpublished = isOwner;

    const acceptedCollabIds = (beat.collaborators ?? [])
      .filter((collaborator) => collaborator.status === "accepted")
      .map((collaborator) => collaborator.userId.toString());

    const showRelated = isListed(beat);
    const [licenses, producer, relatedBeats, collabUsers] = await Promise.all([
      licenseRepository.findByBeatId(beatId),
      userRepository.findById(beat.producerId.toString()),
      showRelated
        ? beatRepository.findRelated(
            beatId,
            beat.genre,
            beat.producerId.toString(),
            6
          )
        : Promise.resolve([] as IBeat[]),
      userRepository.findByIds(acceptedCollabIds),
    ]);

    // Batch-fetch user flags for logged-in users
    const [hasPurchased, initialLiked] = userId
      ? await Promise.all([
          purchaseRepository.hasPurchased(userId, beatId),
          userRole === "buyer" && beat.isPublished && beat.status === "published"
            ? likeRepository.isLiked(userId, beatId)
            : Promise.resolve(false),
        ])
      : [false, false];

    const canLike =
      userRole === "buyer" &&
      beat.isPublished &&
      beat.status === "published";

    // --- Fix N+1: batch-fetch cheapest licenses + producers for related beats ---
    const relatedIds = relatedBeats.map((b) => b._id.toString());
    const [cheapestMap, relatedProducers] = await Promise.all([
      licenseRepository.findCheapestForBeats(relatedIds),
      userRepository.findByIds(
        [...new Set(relatedBeats.map((b) => b.producerId.toString()))]
      ),
    ]);

    const producerMap = new Map(
      relatedProducers.map((p) => [p._id.toString(), p])
    );

    const relatedWithPrices = relatedBeats.map((b) => {
      const bId = b._id.toString();
      const relatedProducer = producerMap.get(b.producerId.toString()) ?? null;
      return {
        beat: toPublicBeatForUi(b, relatedProducer),
        startingPrice: cheapestMap[bId]?.price,
      };
    });

    const serializedLicenses = toLicenseDtos(licenses);

    // Producer derived values
    const producerName =
      producer?.displayName || producer?.name || "Unknown";
    const producerInitials = producerName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const cheapestLicense = licenses.reduce(
      (min, l) => (l.isActive && l.price < min ? l.price : min),
      Infinity
    );

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const beatJsonLd = shouldNoIndex(beat)
      ? null
      : {
      "@context": "https://schema.org",
      "@type": "MusicRecording",
      name: beat.title,
      description:
        beat.description ||
        `${beat.genre} beat at ${beat.bpm || "—"} BPM`,
      genre: beat.genre,
      url: `${appUrl}/beats/${beatId}`,
      image: beat.coverUrl || undefined,
      byArtist: {
        "@type": "MusicGroup",
        name: producerName,
        url: producer?.username
          ? `${appUrl}/producer/${producer.username}`
          : undefined,
      },
      offers:
        cheapestLicense < Infinity
          ? {
              "@type": "Offer",
              price: cheapestLicense,
              priceCurrency: "INR",
              availability: "https://schema.org/InStock",
            }
          : undefined,
    };

    // Serialize the main beat (convert ObjectIds / Dates to strings)
    const serializedBeat = toPublicBeatForUi(
      beat,
      producer,
      buildCollabCredits(beat, collabUsers)
    );

    // Serialize producer
    const serializedProducer = producer ? serializeLean(producer) : null;

    return {
      beat: serializedBeat,
      licenses: serializedLicenses,
      producer: serializedProducer,
      producerName,
      producerInitials,
      relatedBeats: relatedWithPrices,
      hasPurchased,
      initialLiked,
      canLike,
      isOwner,
      canViewUnpublished,
      cheapestLicense,
      beatJsonLd,
      noindex: shouldNoIndex(beat),
      showFreeDownload:
        isFeatureEnabled("freeDownloadLeads") &&
        canShowFreeDownloadCard(beat, hasPurchased),
    };
  },

  /**
   * Fetch metadata for the beat detail page (SEO).
   * Returns null if beat not found or not published.
   */
  async getMetadata(
    beatId: string,
    access?: BeatAccessContext
  ) {
    const beat = await beatRepository.findById(beatId);
    if (!beat) return null;
    if (!canViewBeat(beat, access ?? {})) {
      return null;
    }

    const producer = await userRepository.findById(
      beat.producerId.toString()
    );
    const producerName =
      producer?.displayName || producer?.name || "Unknown";
    const description =
      beat.description ||
      generateBeatDescription(beat, producerName);
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return {
      title: `${beat.title} by ${producerName}`,
      description,
      genre: beat.genre,
      bpm: beat.bpm,
      coverUrl: beat.coverUrl,
      producerName,
      producerUsername: producer?.username,
      canonicalUrl: `${appUrl}/beats/${beatId}`,
      noindex: shouldNoIndex(beat),
    };
  },

  async getOgImageData(id: string) {
    const beat = await beatRepository.findByIdWithKeys(id);
    if (!beat || !isListed(beat)) return null;

    const producer = await userRepository.findById(beat.producerId.toString());
    return {
      title: beat.title,
      genre: beat.genre,
      bpm: beat.bpm,
      key: beat.key,
      coverUrl: beat.coverUrl,
      producerName: producer?.displayName || producer?.name || "Unknown",
    };
  },

  async getEditPageData(beatId: string, userId: string, userRole: string) {
    const beat = await beatRepository.findById(beatId, true);
    if (!beat) throw new NotFoundError("Beat");

    if (beat.producerId.toString() !== userId && userRole !== "admin") {
      throw new ForbiddenError("You can only edit your own beats");
    }

    const licenses = await licenseRepository.findByBeatId(beatId);

    return { beat, licenses };
  },
};
