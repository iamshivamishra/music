"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Status = "idle" | "submitting" | "success";

export default function ContactClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          data?.error || (res.status === 429 ? "Too many requests. Please try again later." : "Something went wrong.");
        throw new Error(msg);
      }

      setStatus("success");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      toast.success("Message sent! We'll get back to you soon.");
    } catch (err) {
      setStatus("idle");
      toast.error(err instanceof Error ? err.message : "Failed to send message. Please try again.");
      nameRef.current?.focus();
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Message sent!</h3>
        <p className="mt-1 text-sm text-muted-foreground">We&rsquo;ll get back to you as soon as possible.</p>
        <Button variant="outline" className="mt-6" onClick={() => setStatus("idle")}>
          Send another message
        </Button>
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit} aria-busy={submitting}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">Name</Label>
          <Input
            id="contact-name"
            ref={nameRef}
            placeholder="Your name"
            required
            aria-required="true"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            placeholder="you@example.com"
            required
            aria-required="true"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-subject">Subject</Label>
        <Input
          id="contact-subject"
          placeholder="What's this about?"
          required
          aria-required="true"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          placeholder="Your message..."
          rows={5}
          required
          aria-required="true"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={submitting}
        />
      </div>
      <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitting ? "Sending…" : "Send Message"}
      </Button>
    </form>
  );
}
