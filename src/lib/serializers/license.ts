import { serializeLean } from "@/lib/serializers/lean";
import type { BeatLicenseType, ILicense } from "@/types";

export interface LicenseDto {
  _id: string;
  beatId: string;
  type: BeatLicenseType;
  name: string;
  price: number;
  streamLimit: number;
  includesWav: boolean;
  includesStems: boolean;
  commercialUse: boolean;
  terms: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toLicenseDto(license: ILicense): LicenseDto {
  const lean = serializeLean(license);
  return {
    _id: String(lean._id),
    beatId: String(lean.beatId),
    type: lean.type,
    name: lean.name,
    price: lean.price,
    streamLimit: lean.streamLimit,
    includesWav: lean.includesWav,
    includesStems: lean.includesStems,
    commercialUse: lean.commercialUse,
    terms: lean.terms,
    isActive: lean.isActive,
    createdAt:
      lean.createdAt instanceof Date
        ? lean.createdAt.toISOString()
        : String(lean.createdAt),
    updatedAt:
      lean.updatedAt instanceof Date
        ? lean.updatedAt.toISOString()
        : String(lean.updatedAt),
  };
}

export function toLicenseDtos(licenses: ILicense[]): LicenseDto[] {
  return licenses.map(toLicenseDto);
}
