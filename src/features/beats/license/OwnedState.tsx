import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function OwnedState() {
  return (
    <Card className="border-success-text/30 bg-success-bg ring-1 ring-success-text/10">
      <CardContent className="p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success-bg ring-1 ring-success-text/20">
          <CheckCircle2 className="h-7 w-7 text-success-text" />
        </div>
        <p className="text-lg font-semibold text-success-text">You own this beat</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Download the full untagged track above.
        </p>
      </CardContent>
    </Card>
  );
}
