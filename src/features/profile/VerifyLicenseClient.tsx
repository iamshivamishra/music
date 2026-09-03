"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/ui/form-field";
import {
  ShieldCheck,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  FileAudio,
  Layers,
  Scale,
  Radio,
  Calendar,
  CreditCard,
  Receipt,
  FileDown,
  Hash,
} from "lucide-react";
import type { LicenseCertificate } from "@/lib/services/purchase.service";

type LookupMode = "purchaseId" | "licenseNumber";

const LICENSE_NUMBER_PATTERN = /^TBL-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const HASH_PATTERN = /^[a-f0-9]{32}$/;

function mapCertificateFromApi(data: Record<string, unknown>): LicenseCertificate {
  const cert = data.certificate as Record<string, unknown>;
  return {
    purchaseId: "",
    type: cert.itemType as "beat" | "pack",
    title: cert.itemTitle as string,
    producerName: cert.buyerName as string,
    licenseType: cert.licenseType as string,
    licenseNumber: cert.licenseNumber as string,
    includesWav: cert.includesWav as boolean,
    includesStems: cert.includesStems as boolean,
    commercialUse: false,
    streamLimit: 0,
    amount: 0,
    orderId: "",
    paymentId: "",
    purchasedAt: new Date(cert.purchaseDate as string),
  };
}

export default function VerifyLicenseClient() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<LookupMode>("purchaseId");
  const [loading, setLoading] = useState(false);
  const [certificate, setCertificate] = useState<LicenseCertificate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyByHash = useCallback(async (hash: string) => {
    setLoading(true);
    setError(null);
    setCertificate(null);
    try {
      const res = await fetch("/api/licenses/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationHash: hash }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "License not found");
      }
      const data = await res.json();
      if (!data.valid) throw new Error("License not found");
      setCertificate(mapCertificateFromApi(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const hash = searchParams.get("hash");
    if (hash && HASH_PATTERN.test(hash)) {
      setQuery(hash);
      verifyByHash(hash);
    }
  }, [searchParams, verifyByHash]);

  const handleVerify = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (HASH_PATTERN.test(trimmed)) {
      return verifyByHash(trimmed);
    }

    setLoading(true);
    setError(null);
    setCertificate(null);

    try {
      const isLicenseNumber = LICENSE_NUMBER_PATTERN.test(trimmed.toUpperCase());
      const activeMode = isLicenseNumber ? "licenseNumber" : mode;

      if (activeMode === "licenseNumber") {
        const res = await fetch("/api/licenses/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licenseNumber: trimmed.toUpperCase() }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "License not found");
        }
        const data = await res.json();
        if (!data.valid) throw new Error("License not found");
        setCertificate(mapCertificateFromApi(data));
      } else {
        const res = await fetch(`/api/user/verify-license?purchaseId=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "License not found");
        }
        const data = await res.json();
        setCertificate(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [query, mode, verifyByHash]);

  return (
    <div className="page-shell max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Verify License</h1>
        <p className="text-sm text-muted-foreground">
          Look up a license certificate by purchase ID, license number (TBL-XXXX-XXXX-XXXX), or verification hash.
        </p>
      </div>

      <Card className="rounded-xl border-border/50 bg-card/70 backdrop-blur-sm">
        <CardContent className="space-y-3 p-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "purchaseId" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("purchaseId")}
            >
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              Purchase ID
            </Button>
            <Button
              type="button"
              variant={mode === "licenseNumber" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("licenseNumber")}
            >
              <Hash className="mr-1.5 h-3.5 w-3.5" />
              License Number
            </Button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1">
              <FormField
                label={mode === "licenseNumber" ? "License Number" : "Purchase ID"}
                htmlFor="verifyQuery"
                error={error ?? undefined}
              >
                <Input
                  id="verifyQuery"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    mode === "licenseNumber"
                      ? "TBL-XXXX-XXXX-XXXX"
                      : "Enter your purchase ID"
                  }
                  className="font-mono"
                />
              </FormField>
            </div>
            <Button type="submit" disabled={loading || !query.trim()}>
              {loading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-1.5 h-4 w-4" />
              )}
              Verify
            </Button>
          </form>
        </CardContent>
      </Card>

      {certificate && (
        <Card className="rounded-xl border-border/50 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              License Certificate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{certificate.title}</p>
                  <p className="text-sm text-muted-foreground">
                    by {certificate.producerName}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {certificate.type}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/30 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  License Type
                </div>
                <p className="mt-1 text-sm font-medium capitalize">
                  {certificate.licenseType}
                </p>
              </div>

              <div className="rounded-lg border border-border/30 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" />
                  Amount
                </div>
                <p className="mt-1 text-sm font-medium">₹{certificate.amount}</p>
              </div>

              <div className="rounded-lg border border-border/30 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Purchased
                </div>
                <p className="mt-1 text-sm font-medium">
                  {new Date(certificate.purchasedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="rounded-lg border border-border/30 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Receipt className="h-3.5 w-3.5" />
                  Payment ID
                </div>
                <p className="mt-1 truncate font-mono text-xs font-medium">
                  {certificate.paymentId}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Entitlements
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={
                    certificate.includesWav
                      ? "border-emerald-500/30 text-emerald-400"
                      : "text-muted-foreground"
                  }
                >
                  <FileAudio className="mr-1 h-3 w-3" />
                  WAV {certificate.includesWav ? "Included" : "Not included"}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    certificate.includesStems
                      ? "border-emerald-500/30 text-emerald-400"
                      : "text-muted-foreground"
                  }
                >
                  <Layers className="mr-1 h-3 w-3" />
                  Stems {certificate.includesStems ? "Included" : "Not included"}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    certificate.commercialUse
                      ? "border-emerald-500/30 text-emerald-400"
                      : "text-muted-foreground"
                  }
                >
                  <Scale className="mr-1 h-3 w-3" />
                  Commercial {certificate.commercialUse ? "Yes" : "No"}
                </Badge>
                {certificate.streamLimit > 0 && (
                  <Badge variant="outline">
                    <Radio className="mr-1 h-3 w-3" />
                    {certificate.streamLimit.toLocaleString()} streams
                  </Badge>
                )}
              </div>
            </div>

            {certificate.licenseNumber && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  License Number
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-primary">
                  {certificate.licenseNumber}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-border/30 bg-muted/30 p-3">
              {certificate.orderId && (
                <p className="font-mono text-xs text-muted-foreground">
                  Order: {certificate.orderId}
                </p>
              )}
              {certificate.purchaseId && (
                <p className="font-mono text-xs text-muted-foreground">
                  Purchase: {certificate.purchaseId}
                </p>
              )}
            </div>

            {certificate.purchaseId && (
              <Button asChild variant="outline" size="sm" className="w-full">
                <a
                  href={`/api/purchases/${certificate.purchaseId}/license-pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileDown className="mr-1.5 h-4 w-4" />
                  Download License PDF
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {error && !loading && (
        <Card className="rounded-xl border-red-500/20 bg-red-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <XCircle className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-sm font-medium">License not found</p>
              <p className="text-xs text-muted-foreground">
                Check your purchase ID and try again. You can find it in your
                transaction history.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
