import { NextRequest } from "next/server";
import { userRepository } from "@/lib/repositories/user.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { formatErrorResponse, NotFoundError } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const producer =
      (await userRepository.findByUsername(slug)) ??
      (await userRepository.findBySlug(slug));

    if (!producer || producer.role !== "producer") {
      throw new NotFoundError("Producer");
    }

    const beats = await beatRepository.findByProducerId(producer._id.toString());

    return Response.json({
      producer: {
        id: producer._id,
        name: producer.name,
        displayName: producer.displayName,
        username: producer.username,
        bio: producer.bio,
        avatarUrl: producer.avatarUrl,
        coverImageUrl: producer.coverImageUrl,
        image: producer.image,
        genres: producer.genres,
        socialLinks: producer.socialLinks,
        verified: producer.verified,
        followersCount: producer.followersCount,
        salesCount: producer.salesCount,
      },
      beats,
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
