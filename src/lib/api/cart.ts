import { requestJson } from "@/lib/api/http";
import type { CartItemPopulated } from "@/types";

interface CartResponse {
  items: CartItemPopulated[];
}

export const cartApi = {
  get(): Promise<CartResponse> {
    return requestJson<CartResponse>("/api/cart");
  },

  add(beatId: string, licenseId: string): Promise<CartResponse> {
    return requestJson<CartResponse>("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beatId, licenseId }),
    });
  },

  updateLicense(beatId: string, licenseId: string): Promise<CartResponse> {
    return requestJson<CartResponse>(`/api/cart/${beatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseId }),
    });
  },

  remove(beatId: string): Promise<{ success: boolean }> {
    return requestJson<{ success: boolean }>(`/api/cart/${beatId}`, {
      method: "DELETE",
    });
  },

  clear(): Promise<{ success: boolean }> {
    return requestJson<{ success: boolean }>("/api/cart", {
      method: "DELETE",
    });
  },
};
