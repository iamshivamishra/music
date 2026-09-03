"use client";

import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { useEffect, useState } from "react";
import {
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { isNavActive } from "@/lib/navigation";
import { getDashboardNav } from "@/lib/dashboard-nav";

interface DashboardShellProps {
  session: Session;
  children: React.ReactNode;
}

export default function DashboardShell({ session, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isAdminPath = pathname.startsWith("/admin");

  useEffect(() => {
    const stored = window.localStorage.getItem("dashboard.sidebar.collapsed");
    if (stored === "1") {
      setCollapsed(true);
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("dashboard.sidebar.collapsed", next ? "1" : "0");
      return next;
    });
  };

  if (isAdminPath) {
    return <>{children}</>;
  }

  const { workspace, library, account } = getDashboardNav(session.user.role);
  const allLinks = [...workspace, ...library, ...account];

  const navHrefs = allLinks.map((link) => link.href);
  const currentTitle =
    allLinks.find((link) => isNavActive(pathname, link.href, navHrefs))?.label || "Dashboard";

  return (
    <div className="flex min-h-screen">
      <SidebarNav
        session={session}
        collapsed={collapsed}
        toggleCollapsed={toggleCollapsed}
      />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MobileDrawer session={session} />
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
                <h1 className="text-lg font-semibold">{currentTitle}</h1>
                <p className="text-xs text-muted-foreground">
                  Manage your account and activity
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
