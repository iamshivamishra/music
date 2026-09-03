"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { isNavActive } from "@/lib/navigation";
import { getDashboardNav } from "@/lib/dashboard-nav";
import type { Session } from "next-auth";

interface MobileDrawerProps {
  session: Session;
}

export function MobileDrawer({ session }: MobileDrawerProps) {
  const pathname = usePathname();

  const { workspace: workspaceLinks, library: libraryLinks, account: accountLinks } =
    getDashboardNav(session.user.role);

  const navHrefs = [
    ...workspaceLinks.map((link) => link.href),
    ...libraryLinks.map((link) => link.href),
    ...accountLinks.map((link) => link.href),
  ];

  const isActive = (href: string) => isNavActive(pathname, href, navHrefs);

  const linkClass = (href: string) =>
    cn(
      "focus-ring flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
      isActive(href)
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    );

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open dashboard navigation"
          />
        }
      >
        <Menu className="h-4 w-4" />
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Dashboard</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div>
            <Link
              href="/"
              className="focus-ring flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
          </div>
          {workspaceLinks.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Studio
              </p>
              <nav className="space-y-1">
                {workspaceLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={linkClass(link.href)}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              My Library
            </p>
            <nav className="space-y-1">
              {libraryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={linkClass(link.href)}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Account
            </p>
            <nav className="space-y-1">
              {accountLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={linkClass(link.href)}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
