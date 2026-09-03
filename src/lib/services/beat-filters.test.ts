import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findProducerIdsBySearch: vi.fn(),
  },
}));

import { beatFilterSchema } from "@/lib/validators/beat";
import { toBeatRepositoryFilters } from "./beat-filters";

describe("toBeatRepositoryFilters", () => {
  it("always queries listed beats via isPublished: true", async () => {
    const input = beatFilterSchema.parse({ genre: "Trap" });
    const filters = await toBeatRepositoryFilters(input);
    expect(filters.isPublished).toBe(true);
  });
});
