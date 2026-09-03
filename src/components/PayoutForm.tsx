"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, IndianRupee, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PayoutFormProps {
  open: boolean;
  onClose: () => void;
  maxAmount: number;
  feePercent: number;
  onSuccess: () => void;
}

type Step = "form" | "confirm";

export default function PayoutForm({ open, onClose, maxAmount, feePercent, onSuccess }: PayoutFormProps) {
  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<"upi" | "bank_transfer">("upi");
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numAmount = Number(amount) || 0;
  const fee = Math.round(numAmount * (feePercent / 100));
  const net = numAmount - fee;

  function reset() {
    setStep("form");
    setAmount("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleContinue() {
    setError(null);
    if (numAmount < 100) {
      setError("Minimum payout is ₹100");
      return;
    }
    if (numAmount > maxAmount) {
      setError(`Maximum withdrawable is ₹${maxAmount.toLocaleString("en-IN")}`);
      return;
    }
    if (method === "upi" && !upiId.trim()) {
      setError("UPI ID is required");
      return;
    }
    if (method === "bank_transfer" && (!accountNumber.trim() || !ifsc.trim() || !accountName.trim())) {
      setError("All bank details are required");
      return;
    }
    setStep("confirm");
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { method, amount: numAmount };
      if (method === "upi") body.upiId = upiId.trim();
      else body.bankDetails = { accountNumber: accountNumber.trim(), ifsc: ifsc.trim().toUpperCase(), accountName: accountName.trim() };

      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to request payout");
        setStep("form");
        return;
      }

      onSuccess();
      reset();
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("form");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{step === "form" ? "Withdraw Earnings" : "Confirm Withdrawal"}</DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "Enter the amount and payout method"
              : "Review and confirm your withdrawal request"}
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-5">
            {/* Method toggle */}
            <div className="flex gap-2">
              {(["upi", "bank_transfer"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                    method === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-accent"
                  )}
                >
                  {m === "upi" ? "UPI" : "Bank Transfer"}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="payout-amount">Amount (₹)</Label>
              <div className="relative mt-1.5">
                <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="payout-amount"
                  type="number"
                  min={100}
                  max={maxAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="pl-9"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Available: ₹{maxAmount.toLocaleString("en-IN")} · Min: ₹100
              </p>
            </div>

            {/* Method-specific fields */}
            {method === "upi" ? (
              <div>
                <Label htmlFor="upi-id">UPI ID</Label>
                <Input
                  id="upi-id"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  className="mt-1.5"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="account-name">Account Holder Name</Label>
                  <Input
                    id="account-name"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Name as on bank account"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="account-number">Account Number</Label>
                  <Input
                    id="account-number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Bank account number"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="ifsc">IFSC Code</Label>
                  <Input
                    id="ifsc"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value)}
                    placeholder="e.g. SBIN0001234"
                    className="mt-1.5 uppercase"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">{error}</p>
            )}
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Withdrawal amount</span>
                <span className="font-medium">₹{numAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Platform fee ({feePercent}%)</span>
                <span className="text-muted-foreground">−₹{fee.toLocaleString("en-IN")}</span>
              </div>
              <div className="my-2 h-px bg-border" />
              <div className="flex justify-between py-1">
                <span className="font-semibold">You receive</span>
                <span className="font-bold text-primary">₹{net.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Payout to
              </p>
              <p className="mt-1 font-medium">
                {method === "upi" ? `UPI: ${upiId}` : `Bank: ${accountName} (${ifsc})`}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Your payout will be processed within 1–2 business days. Your details are saved for future withdrawals.
            </p>
            {error && (
              <p className="text-sm text-destructive" role="alert">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "form" ? (
            <Button onClick={handleContinue} className="w-full gap-1.5">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex w-full gap-2">
              <Button variant="outline" onClick={() => setStep("form")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1 gap-1.5">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Withdrawal
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
