"use client";

import Link from "next/link";
import { Upload, Music, IndianRupee, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const STEPS = [
  {
    icon: Music,
    title: "Upload",
    desc: "Add your tagged preview and master WAV file.",
  },
  {
    icon: IndianRupee,
    title: "Set Prices",
    desc: "Choose license tiers and set your prices in INR.",
  },
  {
    icon: TrendingUp,
    title: "Earn",
    desc: "Artists discover and license your beats. You get paid.",
  },
];

export default function FirstUploadNudge() {
  return (
    <div className="page-shell">
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
          <Upload className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome to your Studio
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Upload your first beat to start selling. Add a tagged preview,
          master WAV, set your prices, and publish.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Your First Beat
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/profile/edit">Set Up Your Profile</Link>
          </Button>
        </div>
        <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
          {STEPS.map((step) => (
            <Card
              key={step.title}
              className="rounded-2xl border-border/50 bg-card/80 p-6"
            >
              <step.icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {step.desc}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
