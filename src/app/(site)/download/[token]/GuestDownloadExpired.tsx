import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { guestSignupHref } from "@/features/payments/guest-signup";

export function GuestDownloadExpired({ email }: { email?: string }) {
  const signupHref = guestSignupHref(email);

  return (
    <div className="page-shell max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">This download link has expired</h1>
        <p className="page-subtitle">
          Guest download links last 48 hours. Create an account with the purchase
          email to keep your library.
        </p>
      </div>
      <Card className="border-border/50">
        <CardContent className="space-y-4 p-5">
          <p className="text-sm text-muted-foreground">
            After you sign up, purchases made with this email are attached to your
            account automatically.
          </p>
          <Button asChild>
            <Link href={signupHref}>
              {email ? `Create account with ${email}` : "Create account"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
