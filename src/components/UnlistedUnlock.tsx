"use client";

import { useEffect } from "react";

export function UnlistedUnlock({ beatId, token }: { beatId: string; token: string }) {
  useEffect(() => {
    if (!token) return;
    void fetch(`/api/beats/${beatId}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  }, [beatId, token]);

  return null;
}
