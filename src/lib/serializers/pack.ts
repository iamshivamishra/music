import { serializeLean } from "@/lib/serializers/lean";
import type { IBeatPack, IUser } from "@/types";

type PublicPackPayload = Omit<IBeatPack, "beats"> & {
  beatCount: number;
  startingPrice: number | null;
};

export function toPublicPackPayload(pack: IBeatPack): PublicPackPayload {
  const { beats, ...rest } = pack;
  const activeTiers = (rest.tiers || []).filter((t) => t.isActive);
  const startingPrice = activeTiers.length
    ? Math.min(...activeTiers.map((t) => t.price))
    : null;

  return {
    ...serializeLean(rest),
    beatCount: beats?.length ?? 0,
    startingPrice,
  };
}

export function toPublicPackForUi(
  pack: IBeatPack,
  producer?: Pick<IUser, "displayName" | "name" | "username"> | null
): PublicPackPayload & { producerName: string; producerUsername?: string } {
  const payload = toPublicPackPayload(pack);
  return {
    ...payload,
    producerName: producer?.displayName || producer?.name || "Unknown Producer",
    producerUsername: producer?.username,
  };
}
