import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Trishul Beats handles your data, including anonymous play and referral stats for sellers.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="page-shell max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Privacy</h1>
        <p className="text-muted-foreground">Last updated September 2026</p>
      </div>

      <div className="space-y-6 text-sm leading-6 text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Seller analytics</h2>
          <p>
            We record anonymous play and referral source to show sellers their stats.
            Events do not include your name, email, IP address, or account id.
            Referral source comes from a first-party cookie (<code>tb_src</code>) set when you
            arrive with a tagged link or a known referrer. The cookie is SameSite=Lax,
            lasts 90 days, and is not used for advertising.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Accounts and purchases</h2>
          <p>
            When you create an account or check out, we store the details needed to
            deliver licenses, receipts, and support — such as email, order items, and
            payment references from Razorpay. Guest checkout stores the email you provide
            so we can send downloads.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p>
            Questions about this notice:{" "}
            <a href="mailto:contact@trishulbeats.com" className="text-foreground underline">
              contact@trishulbeats.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
