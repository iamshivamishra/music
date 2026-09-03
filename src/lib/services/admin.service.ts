import { userRepository } from "@/lib/repositories/user.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { payoutRepository } from "@/lib/repositories/payout.repository";
import { NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import type { IUser, UserRole } from "@/types";

export const adminService = {
  async updateUserRole(userId: string, role: UserRole, adminId?: string): Promise<IUser> {
    const user = await userRepository.updateRole(userId, role);
    if (!user) throw new NotFoundError("User");
    audit({ action: "admin.role_change", userId: adminId, resourceId: userId, metadata: { role } });
    return user;
  },

  async toggleUserVerified(userId: string, adminId?: string): Promise<IUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("User");
    const updated = await userRepository.setVerified(userId, !user.verified);
    if (!updated) throw new NotFoundError("User");
    audit({ action: "admin.verify_toggle", userId: adminId, resourceId: userId, metadata: { verified: !user.verified } });
    return updated;
  },

  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalBuyers: number;
    totalProducers: number;
    totalBeats: number;
    totalSales: number;
    totalRevenue: number;
    pendingPayouts: number;
  }> {
    const [
      totalUsers,
      totalBuyers,
      totalProducers,
      totalBeats,
      totalSales,
      totalRevenue,
      pendingPayouts,
    ] = await Promise.all([
      userRepository.countAll(),
      userRepository.countByRole("buyer"),
      userRepository.countByRole("producer"),
      beatRepository.countAll(),
      purchaseRepository.countAll(),
      purchaseRepository.getTotalRevenue(),
      payoutRepository.countPending(),
    ]);

    return {
      totalUsers,
      totalBuyers,
      totalProducers,
      totalBeats,
      totalSales,
      totalRevenue,
      pendingPayouts,
    };
  },

  async listUsers(
    page: number,
    limit: number,
    _search?: string
  ): Promise<{
    _id: string;
    name: string;
    email: string;
    role: string;
    verified: boolean;
    createdAt: string;
  }[]> {
    const users = await userRepository.findAllPaginated({ page, limit });

    return users.map((u) => ({
      _id: (u._id as unknown as { toString(): string }).toString(),
      name: (u as Record<string, unknown>).name as string ?? "",
      email: (u as Record<string, unknown>).email as string ?? "",
      role: (u as Record<string, unknown>).role as string ?? "buyer",
      verified: (u as Record<string, unknown>).verified as boolean ?? false,
      createdAt: new Date(
        (u as Record<string, unknown>).createdAt as string | Date
      ).toISOString(),
    }));
  },

  async listBeats(
    page: number,
    limit: number,
    _filters?: Record<string, unknown>
  ): Promise<{
    _id: string;
    title: string;
    genre: string;
    coverUrl: string | null;
    plays: number;
    status: string;
    isPublished: boolean;
    producerName: string;
    createdAt: string;
  }[]> {
    const beats = await beatRepository.findAllPaginated({ page, limit });

    return beats.map((b) => {
      const raw = b as Record<string, unknown>;
      const producerId = raw.producerId as
        | { name?: string; username?: string }
        | string
        | null;
      const producerName =
        typeof producerId === "object" && producerId !== null && "name" in producerId
          ? (producerId.name ?? "Unknown")
          : "Unknown";

      return {
        _id: (raw._id as { toString(): string }).toString(),
        title: (raw.title as string) ?? "",
        genre: (raw.genre as string) ?? "",
        coverUrl: (raw.coverUrl as string) ?? null,
        plays: (raw.plays as number) ?? 0,
        status: (raw.status as string) ?? "draft",
        isPublished: (raw.isPublished as boolean) ?? false,
        producerName,
        createdAt: new Date(raw.createdAt as string | Date).toISOString(),
      };
    });
  },

  async listSales(
    page: number,
    limit: number
  ): Promise<{
    _id: string;
    buyerName: string;
    beatTitle: string;
    licenseType: string;
    amount: number;
    createdAt: string;
  }[]> {
    const purchases = await purchaseRepository.findAllPaginated({ page, limit });

    return purchases.map((p) => {
      const raw = p as Record<string, unknown>;
      const buyerId = raw.buyerId as { name?: string } | string | null;
      const beatId = raw.beatId as { title?: string } | string | null;

      const buyerName =
        typeof buyerId === "object" && buyerId !== null && "name" in buyerId
          ? (buyerId.name ?? "Unknown")
          : "Unknown";
      const beatTitle =
        typeof beatId === "object" && beatId !== null && "title" in beatId
          ? (beatId.title ?? "Deleted beat")
          : "Deleted beat";

      return {
        _id: (raw._id as { toString(): string }).toString(),
        buyerName,
        beatTitle,
        licenseType: (raw.licenseType as string) ?? "",
        amount: (raw.amount as number) ?? 0,
        createdAt: new Date(raw.createdAt as string | Date).toISOString(),
      };
    });
  },

  async listProducersWithStats(): Promise<{
    _id: string;
    name: string;
    username: string;
    email: string;
    verified: boolean;
    salesCount: number;
    beatsCount: number;
    producerTier: "founding" | "standard" | null;
    producerTierExpiresAt: string | null;
    platformFeeOverride: number | null;
  }[]> {
    const producers = await userRepository.findProducersAdmin(200);
    const producerIds = producers.map((p) =>
      (p._id as unknown as { toString(): string }).toString()
    );

    const beatCountMap = await beatRepository.countByProducerIds(producerIds);

    return producers.map((p) => {
      const id = (p._id as unknown as { toString(): string }).toString();
      return {
        _id: id,
        name: (p.name as string) ?? "",
        username: (p.username as string) ?? "",
        email: (p.email as string) ?? "",
        verified: p.verified ?? false,
        salesCount: (p as unknown as Record<string, unknown>).salesCount as number ?? 0,
        beatsCount: beatCountMap.get(id) ?? 0,
        producerTier:
          ((p as unknown as Record<string, unknown>).producerTier as
            | "founding"
            | "standard"
            | undefined) ?? null,
        producerTierExpiresAt: (p as unknown as Record<string, unknown>)
          .producerTierExpiresAt
          ? new Date(
              (p as unknown as Record<string, unknown>)
                .producerTierExpiresAt as string | Date
            ).toISOString()
          : null,
        platformFeeOverride:
          typeof (p as unknown as Record<string, unknown>).platformFeeOverride ===
          "number"
            ? ((p as unknown as Record<string, unknown>)
                .platformFeeOverride as number)
            : null,
      };
    });
  },
};
