import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ContactClient from "@/components/ContactClient";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Trishul Beats team.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="page-shell max-w-5xl">
      <div className="page-header text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">Contact Us</h1>
        <p className="mt-3 text-muted-foreground">
          Have questions or feedback? We&rsquo;d love to hear from you.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>Send a Message</CardTitle>
            <CardDescription>Fill out the form and we&rsquo;ll get back to you soon.</CardDescription>
          </CardHeader>
          <CardContent>
            <ContactClient />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardContent className="p-5">
              <Mail className="mb-2 h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Email</h3>
              <p className="mt-1 text-sm text-muted-foreground">contact@trishulbeats.com</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardContent className="p-5">
              <MapPin className="mb-2 h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Location</h3>
              <p className="mt-1 text-sm text-muted-foreground">India</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
