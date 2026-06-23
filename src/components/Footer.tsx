import Link from "next/link";
import { Music } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <Music className="h-5 w-5 text-primary" />
              Trishul Beats
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Marketplace for producers and artists. Find the perfect beat for your next hit.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Browse</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/beats" className="hover:text-foreground transition-colors">All Beats</Link></li>
              <li><Link href="/beats?genre=Hip+Hop" className="hover:text-foreground transition-colors">Hip Hop</Link></li>
              <li><Link href="/beats?genre=Trap" className="hover:text-foreground transition-colors">Trap</Link></li>
              <li><Link href="/beats?genre=R%26B" className="hover:text-foreground transition-colors">R&B</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Follow Us</h4>
            <div className="flex gap-3">
              <a href="https://tr.ee/7kRtfV-ykg" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors" aria-label="YouTube">YouTube</a>
              <a href="https://tr.ee/1eJUtid8So" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors" aria-label="Instagram">Instagram</a>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Trishul Beats. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
