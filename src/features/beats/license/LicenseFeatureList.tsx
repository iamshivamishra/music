import type { ReactNode } from "react";
import {
  Check, X as XIcon, Music, FileAudio, FileArchive, Briefcase, Radio,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LicenseDto } from "@/lib/serializers/license";

function streamLimitLabel(limit: number): string {
  if (limit <= 0 || limit === -1) return "Unlimited";
  if (limit >= 1000) return `${(limit / 1000).toFixed(0)}K`;
  return limit.toString();
}

interface FeatureRow {
  label: string;
  icon: ReactNode;
  check: (l: LicenseDto) => boolean | string;
}

const FEATURES: FeatureRow[] = [
  { label: "MP3 File", icon: <Music className="h-4 w-4" />, check: () => true },
  { label: "WAV File", icon: <FileAudio className="h-4 w-4" />, check: (l) => l.includesWav },
  { label: "Stems", icon: <FileArchive className="h-4 w-4" />, check: (l) => l.includesStems },
  { label: "Commercial Use", icon: <Briefcase className="h-4 w-4" />, check: (l) => l.commercialUse },
  { label: "Stream Limit", icon: <Radio className="h-4 w-4" />, check: (l) => streamLimitLabel(l.streamLimit) },
];

export function LicenseFeatureList({ license }: { license: LicenseDto }) {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-4">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          What&apos;s included
        </p>
        <div className="space-y-2.5">
          {FEATURES.map((feature) => {
            const value = feature.check(license);
            const isString = typeof value === "string";
            const isIncluded = isString ? true : value;

            return (
              <div key={feature.label} className="flex items-center gap-3">
                <span className="shrink-0 text-muted-foreground">{feature.icon}</span>
                <span className="flex-1 text-sm">{feature.label}</span>
                {isString ? (
                  <span className="text-sm font-medium">{value}</span>
                ) : isIncluded ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <XIcon className="h-4 w-4 text-muted-foreground/40" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
