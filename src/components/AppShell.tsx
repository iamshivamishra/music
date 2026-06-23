"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Music,
  Upload,
  User,
  Shield,
  LogOut,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";

interface AppShellProps {
  session: Session | null;
  children: React.ReactNode;
}

function DashboardShell({
  session,
  pathname,
  children,
}: {
  session: Session;
  pathname: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("dashboard.sidebar.collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("dashboard.sidebar.collapsed", next ? "1" : "0");
      return next;
    });
  };

  const isProducer = session.user.role === "producer" || session.user.role === "admin";
  const roleLabel =
    session.user.role === "admin"
      ? "Admin"
      : session.user.role === "producer"
        ? "Producer"
        : "Buyer";

  const workspaceLinks = [
    { href: "/studio", label: "Overview", icon: LayoutDashboard, show: isProducer },
    { href: "/studio/beats", label: "My Beats", icon: Music, show: isProducer },
    { href: "/studio/sales", label: "Sales", icon: BarChart3, show: isProducer },
    { href: "/upload", label: "Upload", icon: Upload, show: isProducer },
  ].filter((item) => item.show);

  const accountLinks = [
    { href: "/profile", label: "Profile", icon: User, show: true },
    { href: "/admin", label: "Admin", icon: Shield, show: session.user.role === "admin" },
    { href: "/settings", label: "Settings", icon: Settings, show: false },
  ].filter((item) => item.show);

  const isActive = (href: string) =>
    href === "/studio"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "hidden border-r border-border/50 bg-card/40 p-4 transition-all duration-200 lg:block",
          collapsed ? "w-20" : "w-72"
        )}
      >
        <div
          className={cn(
            "mb-6 rounded-xl border border-border/60 bg-background/60",
            collapsed ? "p-2" : "p-4"
          )}
        >
          <div className={cn("flex items-center", collapsed ? "justify-center" : "mb-3 gap-2")}>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15">
              <Music className="h-4 w-4 text-primary" />
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-semibold">Trishul Studio</p>
                <p className="text-xs text-muted-foreground">Dashboard</p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          {!collapsed && (
            <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Workspace
            </p>
          )}
          <nav className="space-y-1">
            {workspaceLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : undefined}
                className={cn(
                  "group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive(link.href)
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <span className={cn("flex items-center", collapsed ? "" : "gap-2")}>
                  <link.icon className="h-4 w-4" />
                  {!collapsed && link.label}
                </span>
                {!collapsed && isActive(link.href) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mb-6">
          {!collapsed && (
            <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Account
            </p>
          )}
          <nav className="space-y-1">
            {accountLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive(link.href)
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <link.icon className="h-4 w-4" />
                {!collapsed && link.label}
              </Link>
            ))}
          </nav>
          {!collapsed && (
            <div className="mt-3 rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="truncate text-sm font-medium">{session.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
              <span className="mt-2 inline-flex rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {roleLabel}
              </span>
            </div>
          )}
        </div>

        <div
          className={cn(
            "rounded-xl border border-border/60 bg-background/60",
            collapsed ? "p-2" : "p-3"
          )}
        >
          <div className={cn("mb-2 flex items-center", collapsed ? "justify-center" : "justify-between")}>
            {!collapsed && <p className="text-xs font-medium text-muted-foreground">Preferences</p>}
            <ThemeToggle className="h-7 w-7" />
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full", collapsed ? "justify-center px-0" : "justify-start")}
            onClick={() => signOut({ callbackUrl: "/" })}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
            {!collapsed && "Sign out"}
          </Button>
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:inline-flex"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
              <div>
              <h1 className="text-lg font-semibold">Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                Manage your account and activity
              </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-destructive hidden sm:inline-flex"
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                Sign out
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-destructive sm:hidden"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export default function AppShell({ session, children }: AppShellProps) {
  const pathname = usePathname();

  const isDashboardRoute =
    pathname.startsWith("/studio") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/upload") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard");

  if (session?.user && isDashboardRoute) {
    return (
      <DashboardShell session={session} pathname={pathname}>
        {children}
      </DashboardShell>
    );
  }

  return (
    <>
      <Navbar session={session} />
      <main className="min-h-[calc(100vh-8rem)]">{children}</main>
      <Footer />
    </>
  );
}
