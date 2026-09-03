import { describe, expect, it } from "vitest";
import { toLicenseDto, toLicenseDtos } from "./license";
import type { ILicense } from "@/types";

const sampleLicense: ILicense = {
  _id: "lic_1",
  beatId: "beat_1",
  type: "premium",
  name: "Premium",
  price: 2999,
  streamLimit: 50000,
  includesWav: true,
  includesStems: false,
  commercialUse: true,
  terms: "For streaming and socials",
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-02-01T00:00:00.000Z"),
};

describe("toLicenseDto", () => {
  it("converts Dates to ISO strings and keeps license fields", () => {
    const dto = toLicenseDto(sampleLicense);

    expect(dto._id).toBe("lic_1");
    expect(dto.beatId).toBe("beat_1");
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(dto.updatedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(dto.type).toBe("premium");
    expect(dto.price).toBe(2999);
  });

  it("stringifies ObjectId-like ids", () => {
    const withObjectId = {
      ...sampleLicense,
      _id: { toString: () => "lic_oid", _bsontype: "ObjectId" },
      beatId: { toString: () => "beat_oid", _bsontype: "ObjectId" },
    } as unknown as ILicense;

    const dto = toLicenseDto(withObjectId);
    expect(dto._id).toBe("lic_oid");
    expect(dto.beatId).toBe("beat_oid");
  });

  it("maps a list of licenses", () => {
    expect(toLicenseDtos([sampleLicense])).toHaveLength(1);
    expect(toLicenseDtos([sampleLicense])[0]._id).toBe("lic_1");
  });
});
