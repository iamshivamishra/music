import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Download, FileText, Music, Package } from "lucide-react";
import { auth } from "@/lib/auth";
import { paymentService } from "@/lib/services/payment.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "Purchase Complete",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const rawParams = await searchParams;
  const orderId = typeof rawParams.orderId === "string" ? rawParams.orderId : null;

  const order = orderId
    ? await paymentService.getCheckoutOrderForBuyer(orderId, session.user.id)
    : null;
  const paidOrder = order?.status === "paid" ? order : null;
  const isServiceOrder = paidOrder?.items.some((item) => item.kind === "service") ?? false;
  const serviceJobId = paidOrder?.items.find((item) => item.kind === "service")?.serviceJobId;

  return (
    <div className="page-shell flex flex-col items-center">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 motion-safe:animate-[scale-in_0.3s_ease-out]">
          <CheckCircle2 className="h-10 w-10 text-green-500" aria-hidden="true" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Thank you for your purchase!</h1>
        <p className="mt-3 text-muted-foreground">
          {paidOrder
            ? isServiceOrder
              ? "Your deposit is in. The producer has 72 hours to accept, or we refund it."
              : "Your payment was successful. Your beats are ready to download."
            : "If your payment went through, your purchases will appear in your library shortly."}
        </p>

        {paidOrder && (
          <Card className="mt-8 border-border/50 bg-card/80 text-left">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Order Summary
                </p>
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                  Paid
                </Badge>
              </div>

              <Separator />

              <ul className="space-y-3">
                {paidOrder.items.map((item, index) => (
                  <li key={`${item.kind}-${item.title}-${index}`} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {item.kind === "pack" ? (
                        <Package className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <Music className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      )}
                      <span className="truncate text-sm font-medium">{item.title}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.tier && (
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {item.tier}
                        </Badge>
                      )}
                      <span className="text-sm font-semibold">
                        ₹{item.price.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <Separator />

              {paidOrder.couponCode && paidOrder.discountAmount > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>
                      ₹{(paidOrder.subtotalAmount ?? paidOrder.totalAmount + paidOrder.discountAmount).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      Coupon
                      <Badge variant="outline" className="ml-1 font-mono text-[10px]">
                        {paidOrder.couponCode}
                      </Badge>
                    </span>
                    <span>-₹{paidOrder.discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-primary">
                  ₹{paidOrder.totalAmount.toLocaleString("en-IN")}
                </span>
              </div>

              {paidOrder.receipt && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Receipt: {paidOrder.receipt}</span>
                  <Link
                    href={`/api/orders/${paidOrder.id}/receipt`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <FileText className="h-3 w-3" aria-hidden="true" />
                    Receipt
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-8 space-y-3">
          <Button asChild size="lg" className="w-full">
            <Link
              href={
                isServiceOrder && isFeatureEnabled("customServices")
                  ? serviceJobId
                    ? `/profile/jobs/${serviceJobId}`
                    : "/profile/jobs"
                  : "/profile"
              }
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {isServiceOrder && isFeatureEnabled("customServices")
                ? "View your job"
                : "Download Your Beats"}
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          You can always access your purchases from your{" "}
          <Link href="/profile" className="text-primary hover:underline">
            profile
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
