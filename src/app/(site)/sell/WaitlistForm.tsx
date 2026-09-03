"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function WaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not join the waitlist");
        return;
      }
      setSuccess(data.message || "You've been added to the waitlist!");
      setName("");
      setEmail("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <p role="status" className="text-sm text-success-text">
        {success}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2 text-left">
          <Label htmlFor="waitlist-name">Name</Label>
          <Input
            id="waitlist-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            autoComplete="name"
          />
        </div>
        <div className="flex-1 space-y-2 text-left">
          <Label htmlFor="waitlist-email">Email</Label>
          <Input
            id="waitlist-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Join waitlist
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-left text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
