import { beatRepository } from "@/lib/repositories/beat.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { followRepository } from "@/lib/repositories/follow.repository";
import { logger } from "@/lib/logger";

interface RepairResult {
  model: string;
  field: string;
  documentsChecked: number;
  documentsFixed: number;
}

export const counterRepairService = {
  /**
   * Recalculate Beat.salesCount from actual Purchase documents.
   */
  async repairBeatSalesCounts(): Promise<RepairResult> {
    const salesMap = await purchaseRepository.aggregateCountsByField("beatId");
    const beats = await beatRepository.findAllWithField("salesCount");

    let fixed = 0;
    const updates: Array<{ id: string; salesCount: number }> = [];

    for (const beat of beats) {
      const actual = salesMap.get(beat._id.toString()) ?? 0;
      if (beat.salesCount !== actual) {
        fixed++;
        updates.push({ id: beat._id.toString(), salesCount: actual });
      }
    }

    if (updates.length > 0) {
      await beatRepository.bulkUpdateSalesCount(updates);
    }

    logger.info("Beat salesCount repair complete", {
      checked: beats.length,
      fixed,
    });
    return {
      model: "Beat",
      field: "salesCount",
      documentsChecked: beats.length,
      documentsFixed: fixed,
    };
  },

  /**
   * Recalculate BeatPack.salesCount from actual Purchase documents.
   */
  async repairPackSalesCounts(): Promise<RepairResult> {
    const salesMap = await purchaseRepository.aggregateCountsByField("packId");
    const packs = await packRepository.findAllWithField("salesCount");

    let fixed = 0;
    const updates: Array<{ id: string; salesCount: number }> = [];

    for (const pack of packs) {
      const actual = salesMap.get(pack._id.toString()) ?? 0;
      if (pack.salesCount !== actual) {
        fixed++;
        updates.push({ id: pack._id.toString(), salesCount: actual });
      }
    }

    if (updates.length > 0) {
      await packRepository.bulkUpdateSalesCount(updates);
    }

    logger.info("BeatPack salesCount repair complete", {
      checked: packs.length,
      fixed,
    });
    return {
      model: "BeatPack",
      field: "salesCount",
      documentsChecked: packs.length,
      documentsFixed: fixed,
    };
  },

  /**
   * Recalculate User.salesCount from actual Purchase documents.
   */
  async repairProducerSalesCounts(): Promise<RepairResult> {
    const salesMap =
      await purchaseRepository.aggregateCountsByField("producerId");
    const producers = await userRepository.findProducersWithField("salesCount");

    let fixed = 0;
    const updates: Array<{ id: string; salesCount: number }> = [];

    for (const producer of producers) {
      const actual = salesMap.get(producer._id.toString()) ?? 0;
      if (producer.salesCount !== actual) {
        fixed++;
        updates.push({ id: producer._id.toString(), salesCount: actual });
      }
    }

    if (updates.length > 0) {
      await userRepository.bulkUpdateSalesCount(updates);
    }

    logger.info("User salesCount repair complete", {
      checked: producers.length,
      fixed,
    });
    return {
      model: "User",
      field: "salesCount",
      documentsChecked: producers.length,
      documentsFixed: fixed,
    };
  },

  /**
   * Recalculate User.followersCount from actual Follow documents.
   */
  async repairFollowersCounts(): Promise<RepairResult> {
    const followMap =
      await followRepository.aggregateFollowerCounts();
    const users = await userRepository.findAllWithField("followersCount");

    let fixed = 0;
    const updates: Array<{ id: string; followersCount: number }> = [];

    for (const user of users) {
      const actual = followMap.get(user._id.toString()) ?? 0;
      if (user.followersCount !== actual) {
        fixed++;
        updates.push({ id: user._id.toString(), followersCount: actual });
      }
    }

    if (updates.length > 0) {
      await userRepository.bulkUpdateFollowersCount(updates);
    }

    logger.info("User followersCount repair complete", {
      checked: users.length,
      fixed,
    });
    return {
      model: "User",
      field: "followersCount",
      documentsChecked: users.length,
      documentsFixed: fixed,
    };
  },

  /**
   * Run all counter repairs sequentially and return a summary.
   */
  async repairAll(): Promise<RepairResult[]> {
    const results: RepairResult[] = [];
    results.push(await this.repairBeatSalesCounts());
    results.push(await this.repairPackSalesCounts());
    results.push(await this.repairProducerSalesCounts());
    results.push(await this.repairFollowersCounts());
    logger.info("All counter repairs complete", { results });
    return results;
  },
};
