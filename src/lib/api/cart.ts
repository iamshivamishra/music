import { requestJson } from "@/lib/api/http";
import type { CartItemPopulated, PackCartItemPopulated, LicenseType } from "@/types";

interface CartResponse {
  items: CartItemPopulated[];
  packItems?: PackCartItemPopulated[];
}

export const cartApi = {
  get(): Promise<CartResponse> {
    return requestJson<CartResponse>("/api/cart");
  },

  add(beatId: string, licenseId: string, accessToken?: string): Promise<CartResponse> {
    return requestJson<CartResponse>("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beatId, licenseId, accessToken }),
    });
  },

  addPack(packId: string, packTier: LicenseType): Promise<{ message: string; count: number }> {
    return requestJson<{ message: string; count: number }>("/api/cart/packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId, packTier }),
    });
  },

  updateLicense(beatId: string, licenseId: string): Promise<CartResponse> {
    return requestJson<CartResponse>(`/api/cart/${beatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseId }),
    });
  },

  updatePackTier(packId: string, packTier: LicenseType): Promise<{ message: string }> {
    return requestJson<{ message: string }>(`/api/cart/packs/${packId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packTier }),
    });
  },

  remove(beatId: string): Promise<{ success: boolean }> {
    return requestJson<{ success: boolean }>(`/api/cart/${beatId}`, {
      method: "DELETE",
    });
  },

  removePack(packId: string): Promise<{ message: string }> {
    return requestJson<{ message: string }>(`/api/cart/packs/${packId}`, {
      method: "DELETE",
    });
  },

  clear(): Promise<{ success: boolean }> {
    return requestJson<{ success: boolean }>("/api/cart", {
      method: "DELETE",
    });
  },
};
