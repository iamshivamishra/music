import { Lock, Download, ShieldCheck } from "lucide-react";

export function TrustFooter() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <Lock aria-hidden="true" className="h-3.5 w-3.5" />
        Secure payment
      </span>
      <span className="flex items-center gap-1">
        <Download aria-hidden="true" className="h-3.5 w-3.5" />
        Instant download
      </span>
      <span className="flex items-center gap-1">
        <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
        License guarantee
      </span>
    </div>
  );
}
