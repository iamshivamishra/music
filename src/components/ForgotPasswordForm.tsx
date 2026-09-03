"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setError("Too many requests. Please try again later.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-border/60 bg-card/85 shadow-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
          {sent ? (
            <Mail className="h-5 w-5 text-primary" />
          ) : (
            <Music className="h-5 w-5 text-primary" />
          )}
        </div>
        <CardTitle className="text-2xl font-semibold">
          {sent ? "Check your email" : "Forgot password?"}
        </CardTitle>
        <CardDescription>
          {sent
            ? `We sent a reset link to ${email}. It expires in 1 hour.`
            : "Enter your email and we'll send you a link to reset your password."}
        </CardDescription>
      </CardHeader>

      {!sent ? (
        <CardContent>
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send reset link
            </Button>
          </form>
        </CardContent>
      ) : (
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive an email? Check your spam folder or{" "}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="font-medium text-primary hover:underline"
            >
              try again
            </button>
            .
          </p>
        </CardContent>
      )}

      <CardFooter>
        <Link
          href="/login"
          className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
