"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Crown, Shield, Percent, X } from "lucide-react";
import { FOUNDING_FEE_OVERRIDE, addFoundingPeriod } from "@/lib/founding";

interface ProducerRow {
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
}

export default function AdminProducersClient({
  producers: initial,
}: {
  producers: ProducerRow[];
}) {
  const [producers, setProducers] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);
  const [feeEditId, setFeeEditId] = useState<string | null>(null);
  const [feeInput, setFeeInput] = useState("");

  async function updateTier(id: string, payload: Record<string, unknown>) {
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/producers/${id}/tier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      const { user } = await res.json();

      setProducers((prev) =>
        prev.map((p) =>
          p._id === id
            ? {
                ...p,
                producerTier: user.producerTier ?? null,
                platformFeeOverride:
                  typeof user.platformFeeOverride === "number"
                    ? user.platformFeeOverride
                    : null,
                producerTierExpiresAt: user.producerTierExpiresAt
                  ? new Date(user.producerTierExpiresAt).toISOString()
                  : null,
                verified: user.verified ?? p.verified,
              }
            : p
        )
      );
    } finally {
      setLoading(null);
    }
  }

  function setFounding(id: string) {
    updateTier(id, {
      producerTier: "founding",
      platformFeeOverride: FOUNDING_FEE_OVERRIDE,
      producerTierExpiresAt: addFoundingPeriod().toISOString(),
    });
  }

  function setStandard(id: string) {
    updateTier(id, { producerTier: "standard" });
  }

  function submitFeeOverride(id: string) {
    const fee = parseFloat(feeInput);
    if (isNaN(fee) || fee < 0 || fee > 100) return;
    updateTier(id, { platformFeeOverride: fee });
    setFeeEditId(null);
    setFeeInput("");
  }

  async function toggleVerified(id: string) {
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, action: "toggleVerified" }),
      });
      if (!res.ok) throw new Error("Failed");

      setProducers((prev) =>
        prev.map((p) =>
          p._id === id ? { ...p, verified: !p.verified } : p
        )
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-admin-bg text-left">
              <th className="px-4 py-3 font-medium text-admin-muted">Producer</th>
              <th className="px-4 py-3 font-medium text-admin-muted">Username</th>
              <th className="px-4 py-3 font-medium text-admin-muted text-center">Beats</th>
              <th className="px-4 py-3 font-medium text-admin-muted text-center">Sales</th>
              <th className="px-4 py-3 font-medium text-admin-muted text-center">Tier</th>
              <th className="px-4 py-3 font-medium text-admin-muted text-center">Fee %</th>
              <th className="px-4 py-3 font-medium text-admin-muted text-center">Verified</th>
              <th className="px-4 py-3 font-medium text-admin-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {producers.map((p) => {
              const tierActive =
                p.producerTier === "founding" &&
                (!p.producerTierExpiresAt ||
                  new Date(p.producerTierExpiresAt) > new Date());

              return (
                <tr
                  key={p._id}
                  className="border-b border-border/30 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    @{p.username || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">{p.beatsCount}</td>
                  <td className="px-4 py-3 text-center">{p.salesCount}</td>
                  <td className="px-4 py-3 text-center">
                    {tierActive ? (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <Crown className="mr-1 h-3 w-3" />
                        Founding
                      </Badge>
                    ) : p.producerTier === "standard" ? (
                      <Badge variant="secondary">Standard</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {feeEditId === p._id ? (
                      <form
                        className="flex items-center justify-center gap-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitFeeOverride(p._id);
                        }}
                      >
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="any"
                          value={feeInput}
                          onChange={(e) => setFeeInput(e.target.value)}
                          className="h-7 w-16 rounded border border-border bg-background px-2 text-center text-xs"
                          autoFocus
                        />
                        <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <Percent className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setFeeEditId(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="text-muted-foreground underline-offset-2 hover:underline"
                        onClick={() => {
                          setFeeEditId(p._id);
                          setFeeInput(
                            typeof p.platformFeeOverride === "number"
                              ? String(p.platformFeeOverride)
                              : ""
                          );
                        }}
                      >
                        {typeof p.platformFeeOverride === "number"
                          ? `${p.platformFeeOverride}%`
                          : "Default"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.verified ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-green-400" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!tierActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                          disabled={loading === p._id}
                          onClick={() => setFounding(p._id)}
                        >
                          <Crown className="mr-1 h-3 w-3" />
                          Set Founding
                        </Button>
                      )}
                      {tierActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={loading === p._id}
                          onClick={() => setStandard(p._id)}
                        >
                          Set Standard
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={loading === p._id}
                        onClick={() => toggleVerified(p._id)}
                      >
                        <Shield className="mr-1 h-3 w-3" />
                        {p.verified ? "Unverify" : "Verify"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
