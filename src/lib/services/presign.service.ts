import { storageService } from "@/lib/services/storage.service";
import { logger } from "@/lib/logger";

interface PresignableBeat {
  coverUrl?: string | null;
  audioTaggedUrl?: string | null;
}

async function presignUrl(url: string | null | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  return storageService.getDownloadUrlForValue(url);
}

export const presignService = {
  async withPresignedBeatCovers<T extends PresignableBeat>(
    beats: T[],
  ): Promise<T[]> {
    if (beats.length === 0) return beats;

    try {
      const results = await Promise.all(
        beats.map(async (beat) => {
          const [coverUrl, audioTaggedUrl] = await Promise.all([
            presignUrl(beat.coverUrl),
            presignUrl(beat.audioTaggedUrl),
          ]);
          return {
            ...beat,
            coverUrl: coverUrl ?? beat.coverUrl,
            audioTaggedUrl: audioTaggedUrl ?? beat.audioTaggedUrl,
          };
        }),
      );
      return results;
    } catch (error) {
      logger.error("Failed to presign beat covers", { error, count: beats.length });
      return beats;
    }
  },
};
