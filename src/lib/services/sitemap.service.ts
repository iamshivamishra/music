import { beatRepository } from "@/lib/repositories/beat.repository";
import { userRepository } from "@/lib/repositories/user.repository";

export const sitemapService = {
  async getPublishedBeats(limit = 500): Promise<{ _id: string; updatedAt: Date }[]> {
    return beatRepository.findPublishedForSitemap(limit);
  },

  async getProducers(limit = 200): Promise<{ username: string; updatedAt: Date }[]> {
    return userRepository.findProducersForSitemap(limit);
  },
};
